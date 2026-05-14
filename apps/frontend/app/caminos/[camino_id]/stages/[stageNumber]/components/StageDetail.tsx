import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { StageDetail as StageDetailData } from '@/app/api/stages/stage-types';
import type { AuthUser } from '@/lib/getAuthUser';
import { fetchStage } from '@/app/api/stages/fetch-stage';

interface StageDetailProps {
  caminoId: string;
  stageNumber: number;
  user: AuthUser | null;
}

export async function StageDetail({ caminoId, stageNumber, user }: StageDetailProps) {
  const t = await getTranslations('stage_detail');
  const tCountries = await getTranslations('countries');

  let stage: StageDetailData;
  try {
    stage = await fetchStage(caminoId, stageNumber);
  } catch (e: Error | unknown) {
    console.error('[StageDetail] Error fetching stage:', e);
    return notFound();
  }

  const canEdit =
    user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  const { previousStage, nextStage } = stage;

  return (
    <article>
      {/* Back to camino */}
      <div className="mb-6">
        <Link
          href={`/caminos/${caminoId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t('back_to_camino')}
        </Link>
      </div>

      {/* Stage heading */}
      <h1 className="text-3xl font-bold tracking-tight">
        {t('stage_number', {
          number: stageNumber,
          start: stage.startPoint.name,
          end: stage.endPoint.name,
        })}
      </h1>

      {/* Start and end points */}
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('start_label')}
          </dt>
          <dd className="mt-1 font-medium">
            <Link
              href={`/waypoints/${stage.startPoint.slug}`}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {stage.startPoint.name}
            </Link>
            <span className="ml-2 text-sm text-muted-foreground">
              ({tCountries(stage.startPoint.country.toLowerCase())})
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('end_label')}
          </dt>
          <dd className="mt-1 font-medium">
            <Link
              href={`/waypoints/${stage.endPoint.slug}`}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {stage.endPoint.name}
            </Link>
            <span className="ml-2 text-sm text-muted-foreground">
              ({tCountries(stage.endPoint.country.toLowerCase())})
            </span>
          </dd>
        </div>
      </dl>

      {/* Distance */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('distance_label')}
        </p>
        <p className="mt-1">
          {stage.distance !== null ? (
            <span className="font-medium">{stage.distance.toFixed(1)} km</span>
          ) : (
            <span className="text-muted-foreground">{t('distance_unknown')}</span>
          )}
        </p>
      </div>

      {/* Description */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('description_label')}
        </p>
        <p className="mt-1 whitespace-pre-wrap">
          {stage.description !== null ? (
            stage.description
          ) : (
            <span className="text-muted-foreground">{t('no_description')}</span>
          )}
        </p>
      </div>

      {/* Edit button */}
      {canEdit && (
        <div className="mt-8">
          <Link
            href={`/caminos/${caminoId}/stages/${stageNumber}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t('edit')}
          </Link>
        </div>
      )}

      {/* Stage navigation */}
      <nav
        aria-label={t('nav_aria')}
        className="mt-10 flex items-center justify-between gap-4">
        {previousStage !== null ? (
          <Link
            href={`/caminos/${caminoId}/stages/${previousStage.stageNumber}`}
            aria-label={t('previous_stage_aria', {
              start: previousStage.startPointName,
              end: previousStage.endPointName,
            })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span>
              {previousStage.startPointName}
              <span className="mx-1.5 text-muted-foreground" aria-hidden="true">
                →
              </span>
              {previousStage.endPointName}
            </span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-label={t('first_stage_label')}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-50">
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t('first_stage_label')}
          </button>
        )}

        {nextStage !== null ? (
          <Link
            href={`/caminos/${caminoId}/stages/${nextStage.stageNumber}`}
            aria-label={t('next_stage_aria', {
              start: nextStage.startPointName,
              end: nextStage.endPointName,
            })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>
              {nextStage.startPointName}
              <span className="mx-1.5 text-muted-foreground" aria-hidden="true">
                →
              </span>
              {nextStage.endPointName}
            </span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-label={t('last_stage_label')}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-50">
            {t('last_stage_label')}
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </nav>
    </article>
  );
}
