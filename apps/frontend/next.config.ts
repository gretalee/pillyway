import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/geti18nConfig.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
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
