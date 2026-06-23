import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchWaypoint } from '@/app/api/waypoints/fetch-waypoint';
import { sharedOpenGraph } from '@/lib/seo';
import { fetchAccommodationsByWaypoint } from '@/app/api/accommodations/fetch-accommodation';
import { fetchSightsByWaypoint } from '@/app/api/sights/fetch-sight';
import { buttonVariants } from '@/app/components/ui/button';
import { getAuthUser } from '@/lib/getAuthUser';
import { cn } from '@/lib/utils';
import { BackButton } from './components/BackButton';
import { AccommodationCard } from './components/AccommodationCard';
import { SightCard } from './components/SightCard';
import { WaypointCoordinates } from './components/WaypointCoordinates';
import { WaypointInfo } from './components/WaypointInfo';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const [waypoint, t, og] = await Promise.all([
      fetchWaypoint(slug),
      getTranslations('waypoint_detail'),
      sharedOpenGraph(),
    ]);
    const name = waypoint.name ?? '';
    const country = waypoint.country ?? '';
    if (!name) return {};
    const title = t('meta_title', { name });
    const description = t('meta_description', { name, country });
    return { title, description, openGraph: { ...og, url: `/waypoints/${slug}` } };
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
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-destructive">
          {t('error_loading')}
        </p>
      </div>
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
  const isOwner = user?.roles.some((r) => r.key === 'owner') ?? false;

  const countryLabel = tCountries(
    waypoint.country.toLowerCase() as Parameters<typeof tCountries>[0],
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <WaypointInfo
        slug={slug}
        initialName={waypoint.name}
        initialDescription={waypoint.description}
        countryLabel={countryLabel}
        canContribute={canContribute}
      />

      <WaypointCoordinates
        slug={slug}
        lat={waypoint.lat}
        lng={waypoint.lng}
        canContribute={canContribute}
      />

      {/* Accommodations */}
      <section className="mt-10" aria-labelledby="accommodations-heading">
        <div className="flex items-center gap-2 bg-pillyGreen-300 rounded-tl-lg rounded-tr-lg px-4 py-2 overflow-hidden">
          <h2 id="accommodations-heading" className="text-xl font-semibold">
            {t('accommodations_heading')}
          </h2>
          {canContribute && (
            <div className="flex-1 overflow-hidden flex justify-end">
              <Link
                href={`/waypoints/${slug}/accommodations/new`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'max-w-full',
                )}>
                <span className="truncate">{t('add_accommodation')}</span>
              </Link>
            </div>
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
              <li key={acc.id}>
                <AccommodationCard
                  accommodation={acc}
                  slug={slug}
                  canContribute={canContribute}
                  isOwner={isOwner}
                  className="border border-border rounded-lg p-4"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sights */}
      <section className="mt-10" aria-labelledby="sights-heading">
        <div className="flex items-center gap-2 bg-pillyGreen-300 rounded-tl-lg rounded-tr-lg px-4 py-2  overflow-hidden">
          <h2 id="sights-heading" className="text-xl font-semibold">
            {t('sights_heading')}
          </h2>
          {canContribute && (
            <div className="flex-1 overflow-hidden flex justify-end">
              <Link
                href={`/waypoints/${slug}/sights/new`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'max-w-full',
                )}>
                <span className="truncate">{t('add_sight')}</span>
              </Link>
            </div>
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
                isOwner={isOwner}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
