import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type {
  AccommodationDetail,
  PriceRange,
} from '@/app/api/accommodations/accommodation-types';
import { DeleteAccommodationButton } from './DeleteAccommodationButton';
import { buttonVariants } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

const PRICE_RANGE_SYMBOLS: Record<PriceRange, string> = {
  budget: '€',
  moderate: '€€',
  comfortable: '€€€',
  luxury: '€€€€',
};

interface Props {
  accommodation: AccommodationDetail;
  slug: string;
  canContribute: boolean;
  isOwner: boolean;
}

export async function AccommodationCard({
  accommodation,
  slug,
  canContribute,
  isOwner,
}: Props) {
  const t = await getTranslations('waypoint_detail');

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
            <h3 className="font-semibold">
              <Link
                href={`/accommodations/${accommodation.id}`}
                className="hover:underline underline-offset-4">
                {accommodation.name}
              </Link>
            </h3>
            <span className="inline-block rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {t(`accommodation_type.${accommodation.type}` as Parameters<typeof t>[0])}
            </span>
            {accommodation.priceRange && (
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {PRICE_RANGE_SYMBOLS[accommodation.priceRange]}
              </span>
            )}
            {accommodation.verified && (
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {t('verified_badge')}
              </span>
            )}
          </div>

          {accommodation.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm ">
              {accommodation.description}
            </p>
          )}

          {hasAddress && (
            <address className="mt-2 not-italic text-sm">
              {accommodation.addressStreet && <span>{accommodation.addressStreet}</span>}
              {(accommodation.addressZip || accommodation.addressCity) && (
                <span>
                  ,{' '}
                  {[accommodation.addressZip, accommodation.addressCity]
                    .filter(Boolean)
                    .join(' ')}
                </span>
              )}
              {accommodation.addressCountry && (
                <span>, {accommodation.addressCountry}</span>
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
        </div>

        {(canContribute || isOwner) && (
          <div className="flex shrink-0 flex-col gap-1">
            {canContribute && (
              <Link
                href={`/waypoints/${slug}/accommodations/${accommodation.id}/edit`}
                aria-label={t('edit_accommodation_label')}
                className={cn(buttonVariants({ variant: 'outline' }))}>
                <i
                  className="icon-pencil -translate-y-0.5 text-lg text-muted-foreground hover:text-foreground"
                  aria-hidden="true"
                />
              </Link>
            )}
            <DeleteAccommodationButton
              id={accommodation.id}
              caminoPointId={accommodation.caminoPointId}
              name={accommodation.name}
              createdBy={accommodation.createdBy}
              createdAt={accommodation.createdAt}
            />
          </div>
        )}
      </div>
      {firstImage && (
        <div className="relative mt-3 h-48 w-full overflow-hidden rounded-md">
          <Image
            src={firstImage}
            alt={accommodation.name}
            fill
            unoptimized
            loading="eager"
            className="object-cover"
          />
        </div>
      )}
    </li>
  );
}
