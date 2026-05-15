import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, Pencil } from 'lucide-react';
import { getAuthUser } from '@/lib/getAuthUser';
import { fetchAccommodation } from '@/app/api/accommodations/fetch-accommodation';
import type {
  AccommodationType,
  PriceRange,
} from '@/app/api/accommodations/accommodation-types';

interface Props {
  params: Promise<{ id: string }>;
}

const PRICE_RANGE_SYMBOLS: Record<PriceRange, string> = {
  budget: '€',
  moderate: '€€',
  comfortable: '€€€',
  luxury: '€€€€',
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('accommodation_detail');
  try {
    const accommodation = await fetchAccommodation(id);
    return {
      title: t('meta_title', { name: accommodation.name }),
      description: t('meta_description'),
      openGraph: {
        title: t('meta_title', { name: accommodation.name }),
        description: t('meta_description'),
      },
    };
  } catch {
    return { title: t('meta_title', { name: '' }) };
  }
}

export default async function AccommodationDetailPage({ params }: Props) {
  const { id } = await params;
  const [user, t, tType] = await Promise.all([
    getAuthUser(),
    getTranslations('accommodation_detail'),
    getTranslations('waypoint_detail'),
  ]);

  const canContribute = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  let accommodation: Awaited<ReturnType<typeof fetchAccommodation>>;
  try {
    accommodation = await fetchAccommodation(id);
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

  const hasAddress =
    accommodation.addressStreet ||
    accommodation.addressZip ||
    accommodation.addressCity ||
    accommodation.addressCountry;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href={`/waypoints/${accommodation.waypointSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t('back_label')}
        </Link>
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{accommodation.name}</h1>
            <span className="inline-block rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {tType(
                `accommodation_type.${accommodation.type}` as Parameters<typeof tType>[0],
              )}
            </span>
            {accommodation.priceRange && (
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {PRICE_RANGE_SYMBOLS[accommodation.priceRange]}
              </span>
            )}
            {accommodation.verified && (
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {tType('verified_badge')}
              </span>
            )}
          </div>
        </div>

        {canContribute && (
          <Link
            href={`/waypoints/${accommodation.waypointSlug}/accommodations/${accommodation.id}/edit`}
            aria-label={t('edit_label')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Pencil className="size-4" aria-hidden="true" />
            {t('edit_label')}
          </Link>
        )}
      </div>

      {/* Description */}
      {accommodation.description && (
        <p className="mt-6 whitespace-pre-wrap text-muted-foreground">
          {accommodation.description}
        </p>
      )}

      {/* Contact */}
      {(accommodation.email || accommodation.website) && (
        <div className="mt-6 flex flex-wrap gap-4">
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
      )}

      {/* Address */}
      {hasAddress && (
        <address className="mt-6 not-italic text-sm text-muted-foreground">
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
          {accommodation.addressCountry && <span>{accommodation.addressCountry}</span>}
        </address>
      )}

      {/* Images */}
      {accommodation.imageUrls.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {accommodation.imageUrls.map((url) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-md">
              <Image
                src={url}
                alt={accommodation.name}
                fill
                className="object-cover"
                unoptimized
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
