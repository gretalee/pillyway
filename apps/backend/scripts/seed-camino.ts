import { PrismaPg } from '@prisma/adapter-pg';
import { AccommodationType, PriceRange, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ─── JSON data types ───────────────────────────────────────────────────────

interface AccommodationData {
  name: string;
  type: string;
  description: string | null;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  addressCountry: string | null;
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
  const counts = { points: 0, accommodations: 0, stages: 0 };

  // 1. Upsert Camino
  let caminoId: string;
  if (!dryRun) {
    const camino = await prisma.camino.upsert({
      where: { name: caminoData.name },
      create: {
        name: caminoData.name,
        description: caminoData.description,
        verified: caminoData.verified,
        createdBy,
      },
      update: {
        description: caminoData.description,
        verified: caminoData.verified,
      },
    });
    caminoId = camino.id;
    console.log(`\nCamino "${camino.name}" — id: ${camino.id}`);
  } else {
    caminoId = 'dry-run';
    console.log(`\n[dry run] Camino "${caminoData.name}"`);
  }

  // 2. Upsert CaminoPoints, CaminoPointOrder, Accommodations
  //    Delete all existing point orders first so stale positions from a previous
  //    import (e.g. an old run with more waypoints) don't survive the re-seed.
  if (!dryRun) {
    await prisma.caminoPointOrder.deleteMany({ where: { caminoId } });
  }

  const pointIdByName = new Map<string, string>();
  console.log(`\nPoints (${points.length}):`);

  for (const pd of points) {
    const label =
      `  [${String(pd.position).padStart(2)}] ${pd.name} (${pd.country})` +
      (pd.accommodations.length ? ` — ${pd.accommodations.length} accommodation(s)` : '');
    console.log(label);

    if (dryRun) {
      pointIdByName.set(pd.name, `dry-${pd.position}`);
      continue;
    }

    const point = await prisma.caminoPoint.upsert({
      where: { name_country: { name: pd.name, country: pd.country } },
      create: { name: pd.name, country: pd.country, slug: pd.slug, description: pd.description },
      update: { slug: pd.slug, description: pd.description },
    });
    pointIdByName.set(pd.name, point.id);
    counts.points++;

    await prisma.caminoPointOrder.upsert({
      where: { caminoId_position: { caminoId, position: pd.position } },
      create: { caminoId, caminoPointId: point.id, position: pd.position },
      update: { caminoPointId: point.id },
    });

    for (const acc of pd.accommodations) {
      if (!VALID_ACC_TYPES.has(acc.type)) {
        console.warn(`    ⚠ Unknown type "${acc.type}" for "${acc.name}" — skipped`);
        continue;
      }
      const exists = await prisma.accommodation.findFirst({
        where: { caminoPointId: point.id, name: acc.name },
        select: { id: true },
      });
      if (!exists) {
        await prisma.accommodation.create({
          data: {
            caminoPointId: point.id,
            name: acc.name,
            type: acc.type as AccommodationType,
            description: acc.description,
            addressStreet: acc.addressStreet,
            addressZip: acc.addressZip,
            addressCity: acc.addressCity,
            addressCountry: acc.addressCountry,
            website: acc.website,
            email: acc.email,
            priceRange:
              acc.priceRange && VALID_PRICE_RANGES.has(acc.priceRange)
                ? (acc.priceRange as PriceRange)
                : null,
            verified: acc.verified,
            createdBy,
          },
        });
        counts.accommodations++;
      }
    }
  }

  // 3. Upsert Stages
  console.log(`\nStages (${stages.length}):`);
  for (const sd of stages) {
    const startId = pointIdByName.get(sd.from);
    const endId = pointIdByName.get(sd.to);

    if (!startId || !endId) {
      console.warn(`  ⚠ Unknown point in stage "${sd.from}" → "${sd.to}" — skipped`);
      continue;
    }

    console.log(`  ${sd.from} → ${sd.to}${sd.distance ? ` (${sd.distance} km)` : ''}`);

    if (dryRun) continue;

    await prisma.stage.upsert({
      where: { startPointId_endPointId: { startPointId: startId, endPointId: endId } },
      create: { startPointId: startId, endPointId: endId, distance: sd.distance, description: sd.description },
      update: { distance: sd.distance, description: sd.description },
    });
    counts.stages++;
  }

  // 4. Summary
  console.log('\n─────────────────────────────────────────');
  if (dryRun) {
    console.log('Dry run complete — no data was written.');
  } else {
    console.log('Import complete.');
    console.log(`  Points upserted:        ${counts.points}`);
    console.log(`  Accommodations created: ${counts.accommodations}`);
    console.log(`  Stages upserted:        ${counts.stages}`);
  }
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
