/**
 * One-shot backfill: computes the `countries` array for every camino from its
 * ordered CaminoPoints and writes it back to the database.
 *
 * Run against local DB:
 *   yarn --cwd apps/backend backfill:camino-countries
 *
 * Run against production:
 *   yarn --cwd apps/backend backfill:camino-countries:prod
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const caminos = await prisma.camino.findMany({
    select: {
      id: true,
      name: true,
      countries: true,
      caminoPointOrder: {
        select: { caminoPoint: { select: { country: true } } },
        orderBy: { position: 'asc' },
      },
    },
  });

  console.log(`Found ${caminos.length} camino(s) to process.`);

  let updated = 0;
  let skipped = 0;

  for (const camino of caminos) {
    const computed = extractOrderedCountries(
      camino.caminoPointOrder.map((o) => o.caminoPoint.country),
    );

    const unchanged =
      computed.length === camino.countries.length &&
      computed.every((c, i) => c === camino.countries[i]);

    if (unchanged) {
      skipped++;
      continue;
    }

    await prisma.camino.update({
      where: { id: camino.id },
      data: { countries: computed },
    });

    console.log(
      `  ✓ "${camino.name}" — ${JSON.stringify(camino.countries)} → ${JSON.stringify(computed)}`,
    );
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, already correct: ${skipped}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
