import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pillyway.de';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/backoffice/', '/api/', '/*/edit', '/*/update', '/*/new'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
