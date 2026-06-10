import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { StageDetail as StageDetailData } from '@/app/api/stages/stage-types';
import type { AuthUser } from '@/lib/getAuthUser';
import { fetchStage } from '@/app/api/stages/fetch-stage';
import { fetchAccommodationsByWaypoint } from '@/app/api/accommodations/fetch-accommodation';
import { AccommodationCard } from '@/app/waypoints/[slug]/components/AccommodationCard';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/app/components/ui/button';
import { CollapsibleSection } from '@/app/components/ui/collapsible-section';

interface StageDetailProps {
  caminoId: string;
  stageNumber: number;
  user: AuthUser | null;
}

export async function StageDetail({ caminoId, stageNumber, user }: StageDetailProps) {
  const t = await getTranslations('stage_detail');
  const tGlobal = await getTranslations();
  const tCountries = await getTranslations('countries');

  let stage: StageDetailData;
  try {
    stage = await fetchStage(caminoId, stageNumber);
  } catch (e: Error | unknown) {
    console.error('[StageDetail] Error fetching stage:', e);
    return notFound();
  }

  const [startAccommodations, endAccommodations] = await Promise.all([
    fetchAccommodationsByWaypoint(stage.startPoint.id).catch(() => []),
    fetchAccommodationsByWaypoint(stage.endPoint.id).catch(() => []),
  ]);

  const canEdit = user?.roles.some((r) => r.key === 'pilgrim') ?? false;
  const isOwner = user?.roles.some((r) => r.key === 'owner') ?? false;

  const { previousStage, nextStage } = stage;

  return (
    <article>
      {/* Back to camino */}
      <div className="mb-6">
        <Link
          href={`/caminos/${caminoId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <i className="icon-chevron-left text-xl" aria-hidden="true" />
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
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 max-w-full ">
        <div className="max-w-full overflow-hidden">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('start_label')}
          </dt>
          <dd className="mt-1 font-medium whitespace-normal">
            <Link
              href={`/waypoints/${stage.startPoint.slug}`}
              className="underline text-pillyGreen-600 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {stage.startPoint.name}
            </Link>
            <span className="ml-2 text-sm text-muted-foreground">
              ({tCountries(stage.startPoint.country.toLowerCase())})
            </span>
          </dd>
        </div>
        <div className="max-w-full overflow-hidden">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('end_label')}
          </dt>
          <dd className="mt-1 font-medium whitespace-normal">
            <Link
              href={`/waypoints/${stage.endPoint.slug}`}
              className="underline text-pillyGreen-600 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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

      {canEdit && (
        <div className="mt-8 flex gap-4">
          {/* Edit stage */}
          <Link
            href={`/caminos/${caminoId}/stages/${stageNumber}/edit`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'shrink-0 mt-1',
            )}>
            <i className="icon-pencil text-sm mr-1 -translate-y-0.5" aria-hidden="true" />
            {t('edit')}
          </Link>
          {/* Edit waypoints */}
          <Link
            href={`/caminos/${caminoId}/update`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'shrink-0 mt-1',
            )}>
            <i className="icon-pencil text-sm mr-1 -translate-y-0.5" aria-hidden="true" />
            {tGlobal('camino_detail.edit_waypoints')}
          </Link>
        </div>
      )}

      {/* Stage navigation */}
      <nav
        aria-label={t('nav_aria')}
        className="mt-10 flex flex-col lg:flex-row items-stretch justify-between gap-4 overflow-hidden max-w-full">
        {previousStage !== null ? (
          <Link
            href={`/caminos/${caminoId}/stages/${previousStage.stageNumber}`}
            aria-label={t('previous_stage_aria', {
              start: previousStage.startPointName,
              end: previousStage.endPointName,
            })}
            className={cn(buttonVariants({ variant: 'tertiary', size: 'xl' }))}>
            <i className="icon-chevron-left text-xl" aria-hidden="true" />
            <p className="overflow-hidden text-ellipsis">
              {previousStage.startPointName}
              <span className="mx-1.5" aria-hidden="true">
                →
              </span>
              {previousStage.endPointName}
            </p>
          </Link>
        ) : (
          <Button
            variant={'outline'}
            size={'xl'}
            disabled
            aria-label={t('first_stage_label')}>
            {t('first_stage_label')}
          </Button>
        )}

        {nextStage !== null ? (
          <Link
            href={`/caminos/${caminoId}/stages/${nextStage.stageNumber}`}
            aria-label={t('next_stage_aria', {
              start: nextStage.startPointName,
              end: nextStage.endPointName,
            })}
            className={cn(buttonVariants({ variant: 'tertiary', size: 'xl' }))}>
            <p className="overflow-hidden text-ellipsis">
              {nextStage.startPointName}
              <span className="mx-1.5" aria-hidden="true">
                →
              </span>
              {nextStage.endPointName}
            </p>
            <i className="icon-chevron-right text-xl" aria-hidden="true" />
          </Link>
        ) : (
          <Button
            variant={'outline'}
            size={'xl'}
            disabled
            aria-label={t('last_stage_label')}>
            {t('last_stage_label')}
          </Button>
        )}
      </nav>

      {/* Accommodations at start point */}
      <CollapsibleSection
        className="mt-12"
        buttonClassName="border-b-2 border-pillyGreen-400 drop-shadow-sm"
        id="start-accommodations"
        heading={t('accommodations_at', { name: stage.startPoint.name })}
        defaultOpen={false}>
        {startAccommodations.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {startAccommodations.map((accommodation) => (
              <li key={accommodation.id}>
                <AccommodationCard
                  accommodation={accommodation}
                  slug={stage.startPoint.slug}
                  canContribute={canEdit}
                  isOwner={isOwner}
                  className="border border-border rounded-lg p-4"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t('no_accommodations')}</p>
        )}
      </CollapsibleSection>

      {/* Accommodations at end point */}
      <CollapsibleSection
        className="my-16"
        buttonClassName="border-b-2 border-pillyGreen-400 drop-shadow-sm"
        id="end-accommodations"
        heading={t('accommodations_at', { name: stage.endPoint.name })}
        defaultOpen={true}>
        {endAccommodations.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {endAccommodations.map((accommodation) => (
              <li key={accommodation.id}>
                <AccommodationCard
                  accommodation={accommodation}
                  slug={stage.endPoint.slug}
                  canContribute={canEdit}
                  isOwner={isOwner}
                  className="border border-border rounded-lg p-4"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t('no_accommodations')}</p>
        )}
      </CollapsibleSection>
    </article>
  );
}
