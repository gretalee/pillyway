import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchWaypoint } from '@/app/api/waypoints/fetch-waypoint';
import { fetchAccommodationsByWaypoint } from '@/app/api/accommodations/fetch-accommodation';
import { fetchSightsByWaypoint } from '@/app/api/sights/fetch-sight';
import { buttonVariants } from '@/app/components/ui/button';
import { getAuthUser } from '@/lib/getAuthUser';
import { cn } from '@/lib/utils';
import { BackButton } from './components/BackButton';
import { AccommodationCard } from './components/AccommodationCard';
import { SightCard } from './components/SightCard';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const waypoint = await fetchWaypoint(slug);
    const t = await getTranslations('waypoint_detail');
    const title = t('meta_title', { name: waypoint.name });
    const description = t('meta_description', {
      name: waypoint.name,
      country: waypoint.country,
    });
    return { title, description, openGraph: { title, description } };
  } catch {
    return {};
  }
}

export default async function WaypointDetailPage({ params }: Props) {
  const { slug } = await params;

  const [user, t, tCountries] = await Promise.all([
    getAuthUser(),
    getTranslations('waypoint_detail'),
    getTranslations('countries'),
  ]);

  let waypoint: Awaited<ReturnType<typeof fetchWaypoint>>;
  try {
    waypoint = await fetchWaypoint(slug);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      notFound();
    }
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-destructive">
          {t('error_loading')}
        </p>
      </main>
    );
  }

  const [accommodationsResult, sightsResult] = await Promise.allSettled([
    fetchAccommodationsByWaypoint(waypoint.id),
    fetchSightsByWaypoint(waypoint.id),
  ]);

  const accommodations =
    accommodationsResult.status === 'fulfilled' ? accommodationsResult.value : null;
  const sights = sightsResult.status === 'fulfilled' ? sightsResult.value : null;

  const canContribute = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  const countryLabel = tCountries(
    waypoint.country.toLowerCase() as Parameters<typeof tCountries>[0],
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <h1 className="text-3xl font-bold tracking-tight">{waypoint.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{countryLabel}</p>
      {waypoint.description && (
        <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
          {waypoint.description}
        </p>
      )}

      {/* Accommodations */}
      <section className="mt-10" aria-labelledby="accommodations-heading">
        <div className="flex items-center justify-between">
          <h2 id="accommodations-heading" className="text-xl font-semibold">
            {t('accommodations_heading')}
          </h2>
          {canContribute && (
            <Link
              href={`/waypoints/${slug}/accommodations/new`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              {t('add_accommodation')}
            </Link>
          )}
        </div>

        {accommodations === null ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t('error_loading_accommodations')}
          </p>
        ) : accommodations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('no_accommodations')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {accommodations.map((acc) => (
              <AccommodationCard
                key={acc.id}
                accommodation={acc}
                slug={slug}
                canContribute={canContribute}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Sights */}
      <section className="mt-10" aria-labelledby="sights-heading">
        <div className="flex items-center justify-between">
          <h2 id="sights-heading" className="text-xl font-semibold">
            {t('sights_heading')}
          </h2>
          {canContribute && (
            <Link
              href={`/waypoints/${slug}/sights/new`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              {t('add_sight')}
            </Link>
          )}
        </div>

        {sights === null ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t('error_loading_sights')}
          </p>
        ) : sights.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('no_sights')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {sights.map((sight) => (
              <SightCard
                key={sight.id}
                sight={sight}
                slug={slug}
                canContribute={canContribute}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
