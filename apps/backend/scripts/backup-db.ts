import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  console.error(
    '  Use: node --env-file=.env.prod ./node_modules/.bin/ts-node --project tsconfig.scripts.json scripts/backup-db.ts',
  );
  process.exit(1);
}

const backupDir = path.resolve('backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const env = process.env.DB_BACKUP_ENV ?? 'db';
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = path.join(backupDir, `backup-${env}-${ts}.sql`);

console.log(`\nCreating backup: ${filename}`);
console.log('This may take a moment...\n');

const result = spawnSync(
  'supabase',
  ['db', 'dump', '--db-url', process.env.DATABASE_URL, '-f', filename],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error('Failed to start supabase CLI:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('\nBackup failed.');
  process.exit(result.status ?? 1);
}

const stat = fs.statSync(filename);
const sizeKb = Math.round(stat.size / 1024);
console.log(`\nBackup complete: ${filename} (${sizeKb} KB)`);
