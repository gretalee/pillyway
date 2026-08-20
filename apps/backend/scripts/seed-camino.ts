import { PrismaPg } from '@prisma/adapter-pg';
import { AccommodationType, PriceRange, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { slugify } from '../src/common/slug.utils';

// ─── JSON data types ───────────────────────────────────────────────────────

interface AccommodationData {
  name: string;
  type: string;
  description: string | null;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  phone?: string | null;
  website: string | null;
  email: string | null;
  priceRange: string | null;
  verified: boolean;
}

interface PointData {
  position: number;
  name: string;
  country: string;
  slug: string;
  description: string | null;
  lat?: number | null;
  lng?: number | null;
  accommodations: AccommodationData[];
}

interface StageData {
  from: string;
  to: string;
  distance: number | null;
  description: string | null;
}

interface SeedData {
  _meta: unknown;
  camino: {
    name: string;
    description: string | null;
    verified: boolean;
    createdBy: string;
  };
  points: PointData[];
  stages: StageData[];
}

// ─── Validation sets ───────────────────────────────────────────────────────

const VALID_ACC_TYPES = new Set<string>([
  'hostel', 'monastery', 'b_and_b', 'hotel', 'apartment', 'private_room', 'church',
]);

const VALID_PRICE_RANGES = new Set<string>([
  'budget', 'moderate', 'comfortable', 'luxury',
]);

/**
 * Deduplicate countries preserving first-occurrence order, matching
 * CaminosService's extractOrderedCountries so the seed script fills the same
 * denormalized `countries` column the API writes on create()/update().
 */
function extractOrderedCountries(countries: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of countries) {
    if (!seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}

// ─── CLI args ──────────────────────────────────────────────────────────────

function parseArgs(): { dataFile: string; dryRun: boolean } {
  const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const flags = process.argv.slice(2).filter(a => a.startsWith('--'));

  const dataFile = positional[0] ?? '../../scripts/data/via-baltica.json';
  return { dataFile, dryRun: flags.includes('--dry-run') };
}

function loadData(filePath: string): SeedData {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8')) as SeedData;
  } catch {
    console.error(`Failed to parse JSON: ${resolved}`);
    process.exit(1);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { dataFile, dryRun } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    console.error('  export DATABASE_URL="postgresql://..." before running.');
    process.exit(1);
  }

  const data = loadData(dataFile);

  console.log(`\nImporting: ${data.camino.name}`);
  console.log(`Source:    ${path.resolve(dataFile)}`);
  if (dryRun) console.log('\n[DRY RUN] No changes will be written.\n');

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await seed(prisma, data, dryRun);
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Seed logic ────────────────────────────────────────────────────────────

async function seed(
  prisma: PrismaClient,
  data: SeedData,
  dryRun: boolean,
): Promise<void> {
  const { camino: caminoData, points, stages } = data;
  const createdBy = caminoData.createdBy;

  // ── Dry-run: log + validate without touching the database ───────────────────
  if (dryRun) {
    console.log(`\n[dry run] Camino "${caminoData.name}"`);

    const pointNames = new Set(points.map((p) => p.name));
    for (const sd of stages) {
      if (!pointNames.has(sd.from) || !pointNames.has(sd.to)) {
        throw new Error(
          `Unknown point in stage "${sd.from}" → "${sd.to}" (dry run). Ensure points[] includes both names and they match exactly.`,
        );
      }
    }

    console.log(`\nPoints (${points.length}):`);
    for (const pd of points) {
      console.log(
        `  [${String(pd.position).padStart(2)}] ${pd.name} (${pd.country})` +
          (pd.accommodations.length ? ` — ${pd.accommodations.length} accommodation(s)` : ''),
      );
    }
    console.log(`\nStages (${stages.length}):`);
    for (const sd of stages) {
      console.log(`  ${sd.from} → ${sd.to}${sd.distance ? ` (${sd.distance} km)` : ''}`);
    }
    console.log('\n─────────────────────────────────────────');
    console.log('Dry run complete — no data was written.');
    console.log('─────────────────────────────────────────\n');
    return;
  }

  // ── Real run: all DB operations inside a single transaction ────────────────
  //    This ensures the camino is never left in a partially-rebuilt state if
  //    the script errors mid-import (e.g. after the deleteMany but before all
  //    point orders are recreated).
  const counts = {
    points: 0,
    pointsSkipped: 0,
    accommodations: 0,
    accommodationsUpdated: 0,
    accommodationsSkipped: 0,
    stages: 0,
    stagesSkipped: 0,
  };

  await prisma.$transaction(async (tx) => {
    // 1. Resolve the Camino. Never blindly upsert by name: a name match could
    //    be (a) this seed's own camino from a previous run, safe to refresh,
    //    or (b) a completely unrelated camino a real user independently
    //    created with the same name, which must not be touched at all, or
    //    (c) this seed's own camino that a pilgrim has since edited via the
    //    app (rename, waypoint reorder, etc.), whose edits must survive a
    //    re-seed. Camino.updatedAt is never touched by this script's own
    //    writes below, so — unlike Stage/Accommodation further down — a
    //    divergence from createdAt reliably means a real edit happened via
    //    CaminosService.update(), which always bumps it.
    const caminoSlug = slugify(caminoData.name);
    const countries = extractOrderedCountries(
      [...points]
        .sort((a, b) => a.position - b.position)
        .map((p) => p.country),
    );

    const existingCamino = await tx.camino.findUnique({ where: { name: caminoData.name } });

    let caminoId: string;
    let safeToOverwriteCaminoContent: boolean;

    if (!existingCamino) {
      const created = await tx.camino.create({
        data: {
          name: caminoData.name,
          slug: caminoSlug,
          description: caminoData.description,
          verified: caminoData.verified,
          createdBy,
          countries,
        },
      });
      caminoId = created.id;
      safeToOverwriteCaminoContent = true;
      console.log(`\nCamino "${created.name}" — id: ${created.id} (created)`);
    } else {
      caminoId = existingCamino.id;
      const ownedBySeed = existingCamino.createdBy === createdBy;
      const editedSinceCreation =
        existingCamino.updatedAt.getTime() !== existingCamino.createdAt.getTime();

      if (!ownedBySeed) {
        console.warn(
          `⚠ Camino "${caminoData.name}" already exists with createdBy="${existingCamino.createdBy}" ` +
            `(this seed run's createdBy is "${createdBy}") — leaving it untouched, likely a real user's camino.`,
        );
        safeToOverwriteCaminoContent = false;
      } else if (editedSinceCreation) {
        console.warn(
          `⚠ Camino "${caminoData.name}" has been edited since creation (updatedAt != createdAt) — ` +
            `leaving name/description/verified/countries and waypoint order untouched to avoid clobbering a pilgrim edit.`,
        );
        safeToOverwriteCaminoContent = false;
      } else {
        const updated = await tx.camino.update({
          where: { id: caminoId },
          data: { description: caminoData.description, verified: caminoData.verified, countries },
        });
        safeToOverwriteCaminoContent = true;
        console.log(`\nCamino "${updated.name}" — id: ${updated.id} (refreshed)`);
      }
    }

    // 2. Waypoint order: only rebuild it when the camino content check above
    //    passed. Rebuilding unconditionally would silently discard a
    //    pilgrim's reordering/add/remove of waypoints on the next re-seed.
    if (safeToOverwriteCaminoContent) {
      await tx.caminoPointOrder.deleteMany({ where: { caminoId } });
    }

    // 3. CaminoPoints, CaminoPointOrder, Accommodations.
    const pointIdByName = new Map<string, string>();
    console.log(`\nPoints (${points.length}):`);

    for (const pd of points) {
      console.log(
        `  [${String(pd.position).padStart(2)}] ${pd.name} (${pd.country})` +
          (pd.accommodations.length ? ` — ${pd.accommodations.length} accommodation(s)` : ''),
      );

      // CaminoPoints have no updatedAt/createdBy column, so there is no way
      // to tell a seed-original waypoint apart from one a pilgrim has since
      // edited via PATCH /waypoints/:slug. Never overwrite an existing one —
      // only create genuinely new waypoints. (A migration adding
      // createdBy/updatedAt to CaminoPoint would let this become as strict
      // as the Camino/Accommodation checks below.)
      const existingPoint = await tx.caminoPoint.findUnique({ where: { slug: pd.slug } });
      let point: { id: string };
      if (existingPoint) {
        point = existingPoint;
        counts.pointsSkipped++;
        if (
          existingPoint.name !== pd.name ||
          existingPoint.country !== pd.country ||
          existingPoint.description !== pd.description ||
          existingPoint.lat !== (pd.lat ?? null) ||
          existingPoint.lng !== (pd.lng ?? null)
        ) {
          console.warn(
            `    ⚠ CaminoPoint "${pd.name}" already exists and differs from the seed file — ` +
              `left untouched (CaminoPoint has no edit-tracking column, so this could be a pilgrim edit). Review manually if the seed data changed intentionally.`,
          );
        }
      } else {
        point = await tx.caminoPoint.create({
          data: {
            name: pd.name,
            country: pd.country,
            slug: pd.slug,
            description: pd.description,
            lat: pd.lat ?? null,
            lng: pd.lng ?? null,
          },
        });
        counts.points++;
      }
      pointIdByName.set(pd.name, point.id);

      if (safeToOverwriteCaminoContent) {
        await tx.caminoPointOrder.create({
          data: { caminoId, caminoPointId: point.id, position: pd.position },
        });
      }

      for (const acc of pd.accommodations) {
        if (!VALID_ACC_TYPES.has(acc.type)) {
          console.warn(`    ⚠ Unknown type "${acc.type}" for "${acc.name}" — skipped`);
          continue;
        }
        const accData = {
          type: acc.type as AccommodationType,
          description: acc.description,
          addressStreet: acc.addressStreet,
          addressZip: acc.addressZip,
          addressCity: acc.addressCity,
          addressCountry: acc.addressCountry,
          phone: acc.phone ?? null,
          website: acc.website,
          email: acc.email,
          priceRange:
            acc.priceRange && VALID_PRICE_RANGES.has(acc.priceRange)
              ? (acc.priceRange as PriceRange)
              : null,
        };
        const existing = await tx.accommodation.findFirst({
          where: { caminoPointId: point.id, name: acc.name },
          select: { id: true, createdBy: true, createdAt: true, updatedAt: true },
        });
        if (existing) {
          const ownedBySeed = existing.createdBy === createdBy;
          const editedSinceCreation =
            existing.updatedAt.getTime() !== existing.createdAt.getTime();
          if (!ownedBySeed || editedSinceCreation) {
            console.warn(
              `    ⚠ Accommodation "${acc.name}" already exists (${!ownedBySeed ? 'different createdBy' : 'edited since creation'}) — left untouched.`,
            );
            counts.accommodationsSkipped++;
          } else {
            // verified is deliberately excluded: it's a pilgrim/backoffice
            // decision, not something the seed file should ever override.
            await tx.accommodation.update({
              where: { id: existing.id },
              data: accData,
            });
            counts.accommodationsUpdated++;
          }
        } else {
          await tx.accommodation.create({
            data: { caminoPointId: point.id, name: acc.name, createdBy, verified: acc.verified, ...accData },
          });
          counts.accommodations++;
        }
      }
    }

    // 4. Stages. Like CaminoPoint, Stage has no createdBy column, and its
    //    updatedAt is Prisma-managed (@updatedAt) so this script's own writes
    //    would bump it too — updatedAt vs createdAt can't distinguish "a
    //    pilgrim edited this" from "a previous seed run touched this".
    //    Only create genuinely new stages; never overwrite an existing one.
    console.log(`\nStages (${stages.length}):`);
    for (const sd of stages) {
      const startId = pointIdByName.get(sd.from);
      const endId = pointIdByName.get(sd.to);

      if (!startId || !endId) {
        throw new Error(
          `Unknown point in stage "${sd.from}" → "${sd.to}". Ensure points[] includes both names and they match exactly.`,
        );
      }

      console.log(`  ${sd.from} → ${sd.to}${sd.distance ? ` (${sd.distance} km)` : ''}`);

      const existingStage = await tx.stage.findUnique({
        where: { startPointId_endPointId: { startPointId: startId, endPointId: endId } },
      });
      if (existingStage) {
        counts.stagesSkipped++;
        if (
          existingStage.distance !== sd.distance ||
          existingStage.description !== sd.description
        ) {
          console.warn(
            `    ⚠ Stage "${sd.from} → ${sd.to}" already exists and differs from the seed file — left untouched (no edit-tracking column on Stage).`,
          );
        }
      } else {
        await tx.stage.create({
          data: { startPointId: startId, endPointId: endId, distance: sd.distance, description: sd.description },
        });
        counts.stages++;
      }
    }
  }, { timeout: 60000 });

  // 5. Summary (printed after successful commit)
  console.log('\n─────────────────────────────────────────');
  console.log('Import complete.');
  console.log(`  Points created:            ${counts.points}`);
  console.log(`  Points left untouched:     ${counts.pointsSkipped} (already existed — never overwritten)`);
  console.log(`  Accommodations created:    ${counts.accommodations}`);
  console.log(`  Accommodations updated:    ${counts.accommodationsUpdated}`);
  console.log(`  Accommodations left as-is: ${counts.accommodationsSkipped} (different createdBy or edited since creation)`);
  console.log(`  Stages created:            ${counts.stages}`);
  console.log(`  Stages left untouched:     ${counts.stagesSkipped} (already existed — never overwritten)`);
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
