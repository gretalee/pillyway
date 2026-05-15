'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import type { WaypointDetail } from '@/app/api/waypoints/waypoint-types';
import type {
  AccommodationDetail,
  AccommodationType,
  PriceRange,
} from '@/app/api/accommodations/accommodation-types';
import type { SightDetail } from '@/app/api/sights/sight-types';
import { useAccommodationsByWaypoint } from '@/app/api/accommodations/use-accommodations-by-waypoint';
import { useSightsByWaypoint } from '@/app/api/sights/use-sights-by-waypoint';
import { DeleteAccommodationDialog } from './DeleteAccommodationDialog';
import { DeleteSightDialog } from './DeleteSightDialog';

const PRICE_RANGE_SYMBOLS: Record<PriceRange, string> = {
  budget: '€',
  moderate: '€€',
  comfortable: '€€€',
  luxury: '€€€€',
};

interface Translations {
  back_label: string;
  accommodations_heading: string;
  sights_heading: string;
  no_accommodations: string;
  no_sights: string;
  add_accommodation: string;
  add_sight: string;
  verified_badge: string;
  edit_accommodation_label: string;
  delete_accommodation_label: string;
  edit_sight_label: string;
  delete_sight_label: string;
  country: string;
  accommodation_type: Record<AccommodationType, string>;
  price_range: Record<PriceRange, string>;
}

interface Props {
  waypoint: WaypointDetail;
  canContribute: boolean;
  translations: Translations;
}

interface AccommodationCardProps {
  accommodation: AccommodationDetail;
  slug: string;
  canContribute: boolean;
  translations: Translations;
  onDeleteClick: (accommodation: AccommodationDetail) => void;
}

function AccommodationCard({
  accommodation,
  slug,
  canContribute,
  translations,
  onDeleteClick,
}: AccommodationCardProps) {
  const firstImage =
    accommodation.imageUrls.length > 0 ? accommodation.imageUrls[0] : null;
  const hasAddress =
    accommodation.addressStreet ||
    accommodation.addressZip ||
    accommodation.addressCity ||
    accommodation.addressCountry;

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{accommodation.name}</h3>
            <span className="inline-block rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {translations.accommodation_type[accommodation.type]}
            </span>
            {accommodation.priceRange && (
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {PRICE_RANGE_SYMBOLS[accommodation.priceRange]}
              </span>
            )}
            {accommodation.verified && (
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {translations.verified_badge}
              </span>
            )}
          </div>

          {accommodation.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {accommodation.description}
            </p>
          )}

          {hasAddress && (
            <address className="mt-2 not-italic text-sm text-muted-foreground">
              {accommodation.addressStreet && (
                <span>
                  {accommodation.addressStreet}
                  <br />
                </span>
              )}
              {(accommodation.addressZip || accommodation.addressCity) && (
                <span>
                  {[accommodation.addressZip, accommodation.addressCity]
                    .filter(Boolean)
                    .join(' ')}
                  <br />
                </span>
              )}
              {accommodation.addressCountry && (
                <span>{accommodation.addressCountry}</span>
              )}
            </address>
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            {accommodation.email && (
              <a
                href={`mailto:${accommodation.email}`}
                className="text-sm text-primary underline-offset-4 hover:underline">
                {accommodation.email}
              </a>
            )}
            {accommodation.website && (
              <a
                href={accommodation.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline">
                {accommodation.website}
              </a>
            )}
          </div>

          {firstImage && (
            <img
              src={firstImage}
              alt={accommodation.name}
              loading="lazy"
              className="mt-3 max-h-48 w-full rounded-md object-cover"
            />
          )}
        </div>

        {canContribute && (
          <div className="flex shrink-0 flex-col gap-1">
            <Link
              href={`/waypoints/${slug}/accommodations/${accommodation.id}/edit`}
              aria-label={translations.edit_accommodation_label}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Pencil className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              aria-label={translations.delete_accommodation_label}
              onClick={() => onDeleteClick(accommodation)}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

interface SightCardProps {
  sight: SightDetail;
  slug: string;
  canContribute: boolean;
  translations: Translations;
  onDeleteClick: (sight: SightDetail) => void;
}

function SightCard({
  sight,
  slug,
  canContribute,
  translations,
  onDeleteClick,
}: SightCardProps) {
  const firstImage = sight.imageUrls.length > 0 ? sight.imageUrls[0] : null;

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{sight.name}</h3>
            {sight.verified && (
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {translations.verified_badge}
              </span>
            )}
          </div>

          {sight.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {sight.description}
            </p>
          )}

          {sight.address && (
            <p className="mt-2 text-sm text-muted-foreground">{sight.address}</p>
          )}

          {sight.latitude !== null && sight.longitude !== null && (
            <p className="mt-2 text-sm text-muted-foreground">
              {sight.latitude.toFixed(6)}, {sight.longitude.toFixed(6)}
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
        </div>

        {canContribute && (
          <div className="flex shrink-0 flex-col gap-1">
            <Link
              href={`/waypoints/${slug}/sights/${sight.id}/edit`}
              aria-label={translations.edit_sight_label}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Pencil className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              aria-label={translations.delete_sight_label}
              onClick={() => onDeleteClick(sight)}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function WaypointDetailClient({ waypoint, canContribute, translations }: Props) {
  const router = useRouter();

  const accommodationsQuery = useAccommodationsByWaypoint(waypoint.id);
  const sightsQuery = useSightsByWaypoint(waypoint.id);

  const [deleteAccommodation, setDeleteAccommodation] =
    useState<AccommodationDetail | null>(null);
  const [deleteSight, setDeleteSight] = useState<SightDetail | null>(null);

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/caminos');
    }
  }

  const accommodations = accommodationsQuery.data ?? [];
  const sights = sightsQuery.data ?? [];

  return (
    <article>
      {/* Back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {translations.back_label}
        </button>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold tracking-tight">{waypoint.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{translations.country}</p>
      {waypoint.description && (
        <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
          {waypoint.description}
        </p>
      )}

      {/* Accommodations */}
      <section className="mt-10" aria-labelledby="accommodations-heading">
        <div className="flex items-center justify-between">
          <h2 id="accommodations-heading" className="text-xl font-semibold">
            {translations.accommodations_heading}
          </h2>
          {canContribute && (
            <Link
              href={`/waypoints/${waypoint.slug}/accommodations/new`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {translations.add_accommodation}
            </Link>
          )}
        </div>

        {accommodations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {translations.no_accommodations}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {accommodations.map((acc) => (
              <AccommodationCard
                key={acc.id}
                accommodation={acc}
                slug={waypoint.slug}
                canContribute={canContribute}
                translations={translations}
                onDeleteClick={setDeleteAccommodation}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Sights */}
      <section className="mt-10" aria-labelledby="sights-heading">
        <div className="flex items-center justify-between">
          <h2 id="sights-heading" className="text-xl font-semibold">
            {translations.sights_heading}
          </h2>
          {canContribute && (
            <Link
              href={`/waypoints/${waypoint.slug}/sights/new`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {translations.add_sight}
            </Link>
          )}
        </div>
        {sights.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{translations.no_sights}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {sights.map((sight) => (
              <SightCard
                key={sight.id}
                sight={sight}
                slug={waypoint.slug}
                canContribute={canContribute}
                translations={translations}
                onDeleteClick={setDeleteSight}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Delete dialogs */}
      <DeleteAccommodationDialog
        id={deleteAccommodation?.id ?? ''}
        caminoPointId={waypoint.id}
        name={deleteAccommodation?.name ?? ''}
        open={deleteAccommodation !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAccommodation(null);
        }}
      />

      <DeleteSightDialog
        id={deleteSight?.id ?? ''}
        caminoPointId={waypoint.id}
        name={deleteSight?.name ?? ''}
        open={deleteSight !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSight(null);
        }}
      />
    </article>
  );
}
