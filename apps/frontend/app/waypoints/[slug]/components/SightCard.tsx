import Image from 'next/image';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { SightDetail } from '@/app/api/sights/sight-types';
import { DeleteSightButton } from './DeleteSightButton';

interface Props {
  sight: SightDetail;
  slug: string;
  canContribute: boolean;
  isOwner: boolean;
}

export async function SightCard({ sight, slug, canContribute, isOwner }: Props) {
  const t = await getTranslations('waypoint_detail');

  const firstImage = sight.imageUrls.length > 0 ? sight.imageUrls[0] : null;

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

          {firstImage && (
            <div className="relative mt-3 h-48 w-full overflow-hidden rounded-md">
              <Image
                src={firstImage}
                alt={sight.name}
                fill
                className="object-cover"
                unoptimized
                loading="eager"
              />
            </div>
          )}
        </div>

        {(canContribute || isOwner) && (
          <div className="flex shrink-0 flex-col gap-1">
            {canContribute && (
              <Link
                href={`/waypoints/${slug}/sights/${sight.id}/edit`}
                aria-label={t('edit_sight_label')}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Pencil className="size-4" aria-hidden="true" />
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
