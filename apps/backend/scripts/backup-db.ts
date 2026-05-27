import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const connectionUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionUrl) {
  console.error('Neither DIRECT_URL nor DATABASE_URL is set.');
  process.exit(1);
}
if (process.env.DIRECT_URL) {
  console.log('Using DIRECT_URL (direct connection, required for pg_dump).');
} else {
  console.log('DIRECT_URL not set — falling back to DATABASE_URL.');
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
  'pg_dump',
  ['--format=plain', '--schema=public', `--file=${filename}`, connectionUrl],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error('Failed to start pg_dump:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('\nBackup failed.');
  process.exit(result.status ?? 1);
}

const stat = fs.statSync(filename);
const sizeKb = Math.round(stat.size / 1024);
console.log(`\nBackup complete: ${filename} (${sizeKb} KB)`);
