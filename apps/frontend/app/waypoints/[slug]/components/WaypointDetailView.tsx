import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { WaypointDetail, AccommodationSummary, SightSummary } from '@/app/api/waypoints/waypoint-types';
import type { AuthUser } from '@/lib/getAuthUser';

interface Props {
  waypoint: WaypointDetail;
  user: AuthUser | null;
}

// Narrow helper type: only the keys from waypoint_detail that the card components use.
type CardTranslations = {
  verified_badge: string;
  vote_up_aria: string;
  vote_down_aria: string;
};

interface AccommodationCardProps {
  accommodation: AccommodationSummary;
  translations: CardTranslations;
  canVote: boolean;
}

function AccommodationCard({ accommodation, translations, canVote }: AccommodationCardProps) {
  const firstImage = accommodation.imageUrls.length > 0 ? accommodation.imageUrls[0] : null;

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{accommodation.name}</h3>
          {accommodation.verified && (
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {translations.verified_badge}
            </span>
          )}
          {accommodation.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {accommodation.description}
            </p>
          )}
          {firstImage && (
            <img
              src={firstImage}
              alt={accommodation.name}
              loading="lazy"
              className="mt-3 max-h-48 w-full rounded-md object-cover"
            />
          )}
        </div>
        {canVote && (
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              disabled
              aria-label={translations.vote_up_aria}
              className="inline-flex cursor-not-allowed items-center justify-center rounded-md p-1.5 text-muted-foreground opacity-40">
              <ThumbsUp className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled
              aria-label={translations.vote_down_aria}
              className="inline-flex cursor-not-allowed items-center justify-center rounded-md p-1.5 text-muted-foreground opacity-40">
              <ThumbsDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

interface SightCardProps {
  sight: SightSummary;
}

function SightCard({ sight }: SightCardProps) {
  const firstImage = sight.imageUrls.length > 0 ? sight.imageUrls[0] : null;

  return (
    <li className="rounded-lg border border-border p-4">
      <h3 className="font-semibold">{sight.name}</h3>
      {sight.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {sight.description}
        </p>
      )}
      {firstImage && (
        <img
          src={firstImage}
          alt={sight.name}
          loading="lazy"
          className="mt-3 max-h-48 w-full rounded-md object-cover"
        />
      )}
    </li>
  );
}

export async function WaypointDetailView({ waypoint, user }: Props) {
  const t = await getTranslations('waypoint_detail');
  const tCountries = await getTranslations('countries');

  const canContribute = user?.roles.some((r) => r.key === 'pilgrim' || r.key === 'owner') ?? false;

  const cardTranslations: CardTranslations = {
    verified_badge: t('verified_badge'),
    vote_up_aria: t('vote_up_aria'),
    vote_down_aria: t('vote_down_aria'),
  };

  return (
    <article>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/caminos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t('back_label')}
        </Link>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold tracking-tight">{waypoint.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {tCountries(waypoint.country.toLowerCase())}
      </p>
      {waypoint.description && (
        <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{waypoint.description}</p>
      )}

      {/* Accommodations */}
      <section className="mt-10" aria-labelledby="accommodations-heading">
        <div className="flex items-center justify-between">
          <h2 id="accommodations-heading" className="text-xl font-semibold">
            {t('accommodations_heading')}
          </h2>
          {canContribute && (
            <Link
              href={`/waypoints/${waypoint.slug}/accommodations/new`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t('add_accommodation')}
            </Link>
          )}
        </div>
        {waypoint.accommodations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('no_accommodations')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {waypoint.accommodations.map((acc) => (
              <AccommodationCard
                key={acc.id}
                accommodation={acc}
                translations={cardTranslations}
                canVote={canContribute}
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
              href={`/waypoints/${waypoint.slug}/sights/new`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t('add_sight')}
            </Link>
          )}
        </div>
        {waypoint.sights.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('no_sights')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {waypoint.sights.map((sight) => (
              <SightCard key={sight.id} sight={sight} />
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
