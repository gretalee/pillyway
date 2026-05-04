import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    // DIRECT_URL bypasses the connection pooler — required for DDL migrations.
    // Falls back to DATABASE_URL for local dev where both are the same.
    // undefined is fine for `prisma generate` (no DB connection needed).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
