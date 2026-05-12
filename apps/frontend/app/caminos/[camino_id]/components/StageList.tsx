import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { StageListItem } from '@/app/api/stages/stage-types';
import { fetchStages } from '@/app/api/stages/fetch-stages';

interface StageListProps {
  caminoId: string;
}

export async function StageList({ caminoId }: StageListProps) {
  const t = await getTranslations('camino_detail');

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
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {stage.stageNumber}
            </span>
            <span className="flex-1 font-medium">
              {stage.startPoint.name}
              <span className="mx-2 text-muted-foreground" aria-hidden="true">
                →
              </span>
              {stage.endPoint.name}
            </span>
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
