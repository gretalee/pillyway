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
  const counts = { points: 0, accommodations: 0, accommodationsUpdated: 0, stages: 0 };

  await prisma.$transaction(async (tx) => {
    // 1. Upsert Camino
    const caminoSlug = slugify(caminoData.name);
    const camino = await tx.camino.upsert({
      where: { name: caminoData.name },
      create: {
        name: caminoData.name,
        slug: caminoSlug,
        description: caminoData.description,
        verified: caminoData.verified,
        createdBy,
      },
      update: {
        description: caminoData.description,
        verified: caminoData.verified,
      },
    });
    const caminoId = camino.id;
    console.log(`\nCamino "${camino.name}" — id: ${camino.id}`);

    // 2. Replace point orders atomically: delete all existing rows first so
    //    stale positions from a previous import don't survive the re-seed.
    await tx.caminoPointOrder.deleteMany({ where: { caminoId } });

    // 3. Upsert CaminoPoints, recreate CaminoPointOrder, create Accommodations
    const pointIdByName = new Map<string, string>();
    console.log(`\nPoints (${points.length}):`);

    for (const pd of points) {
      console.log(
        `  [${String(pd.position).padStart(2)}] ${pd.name} (${pd.country})` +
          (pd.accommodations.length ? ` — ${pd.accommodations.length} accommodation(s)` : ''),
      );

      const point = await tx.caminoPoint.upsert({
        where: { slug: pd.slug },
        create: { name: pd.name, country: pd.country, slug: pd.slug, description: pd.description },
        update: { name: pd.name, country: pd.country, description: pd.description },
      });
      pointIdByName.set(pd.name, point.id);
      counts.points++;

      // deleteMany cleared all rows for this camino above, so create is safe here
      await tx.caminoPointOrder.create({
        data: { caminoId, caminoPointId: point.id, position: pd.position },
      });

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
          verified: acc.verified,
        };
        const existing = await tx.accommodation.findFirst({
          where: { caminoPointId: point.id, name: acc.name },
          select: { id: true },
        });
        if (existing) {
          await tx.accommodation.update({ where: { id: existing.id }, data: accData });
          counts.accommodationsUpdated++;
        } else {
          await tx.accommodation.create({
            data: { caminoPointId: point.id, name: acc.name, createdBy, ...accData },
          });
          counts.accommodations++;
        }
      }
    }

    // 4. Upsert Stages
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

      await tx.stage.upsert({
        where: { startPointId_endPointId: { startPointId: startId, endPointId: endId } },
        create: { startPointId: startId, endPointId: endId, distance: sd.distance, description: sd.description },
        update: { distance: sd.distance, description: sd.description },
      });
      counts.stages++;
    }
  }, { timeout: 60000 });

  // 5. Summary (printed after successful commit)
  console.log('\n─────────────────────────────────────────');
  console.log('Import complete.');
  console.log(`  Points upserted:        ${counts.points}`);
  console.log(`  Accommodations created: ${counts.accommodations}`);
  console.log(`  Accommodations updated: ${counts.accommodationsUpdated}`);
  console.log(`  Stages upserted:        ${counts.stages}`);
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
