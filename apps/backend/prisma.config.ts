import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    // DIRECT_URL bypasses the connection pooler — required for DDL migrations.
    // Falls back to DATABASE_URL for local dev where both are the same.
    // `||` (not `??`) is intentional: an empty string is treated the same as
    // unset so that an accidental DATABASE_URL="" does not break prisma generate.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
