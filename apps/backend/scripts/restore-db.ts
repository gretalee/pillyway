import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const filePath = args[0];

if (!filePath) {
  console.error('Missing backup file argument.');
  console.error('Usage: yarn db:restore:dev -- <backup-file.sql>');
  console.error(
    'Example: yarn db:restore:dev -- backups/backup-dev-2026-05-26T10-30-00.sql',
  );
  process.exit(1);
}

const resolved = path.resolve(filePath);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;

console.log('\n1/2 Dropping existing schema...');
const drop = spawnSync(
  'psql',
  [dbUrl, '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'],
  { stdio: 'inherit' },
);
if (drop.error) {
  console.error('Failed to start psql:', drop.error.message);
  process.exit(1);
}
if (drop.status !== 0) {
  process.exit(drop.status ?? 1);
}

console.log(`\n2/2 Restoring from: ${resolved}\n`);
const restore = spawnSync('psql', [dbUrl, '-f', resolved], {
  stdio: 'inherit',
});
if (restore.error) {
  console.error('Failed to start psql:', restore.error.message);
  process.exit(1);
}
if (restore.status !== 0) {
  process.exit(restore.status ?? 1);
}

console.log('\nRestore complete.');
