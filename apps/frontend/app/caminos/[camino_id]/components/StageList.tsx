import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { StageListItem } from '@/app/api/stages/stage-types';
import { fetchStages } from '@/app/api/stages/fetch-stages';
import { cn } from '@/lib/utils';

interface StageListProps {
  caminoId: string;
}

export async function StageList({ caminoId }: StageListProps) {
  const t = await getTranslations('camino_detail');
  const tCodes = await getTranslations('country_codes');

  let stages: StageListItem[];
  try {
    stages = await fetchStages(caminoId);
  } catch (e: Error | unknown) {
    console.error('[StageList] Error fetching stages:', e);
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('error_loading_stages')}
      </p>
    );
  }

  if (stages.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('no_stages')}</p>;
  }

  return (
    <ol className="space-y-2">
      {stages.map((stage) => (
        <li key={stage.id}>
          <Link
            href={`/caminos/${caminoId}/stages/${stage.stageNumber}`}
            className={cn(
              'flex items-center  rounded-lg border border-border  text-sm transition-colors',
              'gap-1 lg:gap-3',
              'px-2 py-3 lg:px-4',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {stage.stageNumber}
            </span>
            <div className="flex-1 flex overflow-hidden min-w-0 font-medium truncate">
              <span className="flex-1 font-medium truncate">
                {stage.startPoint.name}
                {stage.startPoint.country && (
                  <span className="ml-1 text-muted-foreground">
                    ({tCodes(stage.startPoint.country as Parameters<typeof tCodes>[0])})
                  </span>
                )}
              </span>
            </div>

            <span className="mx-1 lg:mx-2 text-muted-foreground" aria-hidden="true">
              →
            </span>

            <div className="flex-1 flex overflow-hidden min-w-0 font-medium truncate">
              <span className="flex-1 font-medium truncate">
                {stage.endPoint.name}
                {stage.endPoint.country && (
                  <span className="ml-1 text-muted-foreground">
                    ({tCodes(stage.endPoint.country as Parameters<typeof tCodes>[0])})
                  </span>
                )}
              </span>
            </div>

            {stage.distance !== null && (
              <span className="shrink-0 text-muted-foreground">
                {stage.distance.toFixed(1)} km
              </span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}
