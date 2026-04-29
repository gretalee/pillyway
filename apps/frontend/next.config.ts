import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/geti18nConfig.ts');

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};

export default withNextIntl(nextConfig);
