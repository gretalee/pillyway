import type { MetadataRoute } from 'next';
import { fetchCaminos } from '@/app/api/caminos/caminos';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pillyway.de';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/caminos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/imprint`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  let caminoRoutes: MetadataRoute.Sitemap = [];
  try {
    const caminos = await fetchCaminos();
    caminoRoutes = caminos.map((camino) => ({
      url: `${SITE_URL}/caminos/${camino.slug}`,
      lastModified: new Date(camino.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // continue with static routes only if the API is unreachable
  }

  return [...staticRoutes, ...caminoRoutes];
}
