import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/geti18nConfig.ts');

function getSupabaseStoragePattern() {
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    const parsedSupabaseUrl = new URL(supabaseUrl);

    return {
      protocol: parsedSupabaseUrl.protocol.replace(':', '') as 'http' | 'https',
      hostname: parsedSupabaseUrl.hostname,
      ...(parsedSupabaseUrl.port ? { port: parsedSupabaseUrl.port } : {}),
      pathname: '/storage/v1/object/public/**',
    };
  } catch {
    return null;
  }
}

const supabaseStoragePattern = getSupabaseStoragePattern();

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  images: {
    remotePatterns: [
      ...(supabaseStoragePattern ? [supabaseStoragePattern] : []),
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
