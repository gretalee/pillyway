import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { SightDetail } from '@/app/api/sights/sight-types';
import { PictureGallery } from '@/app/components/PictureGallery';
import { DeleteSightButton } from './DeleteSightButton';
import { buttonVariants } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  sight: SightDetail;
  slug: string;
  canContribute: boolean;
  isOwner: boolean;
}

export async function SightCard({ sight, slug, canContribute, isOwner }: Props) {
  const t = await getTranslations('waypoint_detail');

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{sight.name}</h3>
            {sight.verified && (
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {t('verified_badge')}
              </span>
            )}
          </div>

          {sight.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm ">{sight.description}</p>
          )}

          {sight.address && <p className="mt-2 text-sm ">{sight.address}</p>}

          {sight.latitude !== null && sight.longitude !== null && (
            <p className="mt-2 text-sm ">
              Pos: {sight.latitude.toFixed(6)}, {sight.longitude.toFixed(6)}
            </p>
          )}

          {sight.imageUrls.length > 0 && (
            <PictureGallery
              pictures={sight.imageUrls.map((url) => ({ id: url, url }))}
              className="mt-3 sm:grid-cols-3 lg:grid-cols-3"
            />
          )}
        </div>

        {(canContribute || isOwner) && (
          <div className="flex shrink-0 flex-col gap-1">
            {canContribute && (
              <Link
                href={`/waypoints/${slug}/sights/${sight.id}/edit`}
                aria-label={t('edit_sight_label')}
                className={cn(buttonVariants({ variant: 'outline' }))}>
                <i className="icon-pencil text-xl" aria-hidden="true" />
              </Link>
            )}
            <DeleteSightButton
              id={sight.id}
              caminoPointId={sight.caminoPointId}
              name={sight.name}
              createdBy={sight.createdBy}
              createdAt={sight.createdAt}
            />
          </div>
        )}
      </div>
    </li>
  );
}
