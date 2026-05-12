'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useStage } from '@/app/api/stages/use-stage';
import type { UpdateStagePayload } from '@/app/api/stages/stage-types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { useUpdateStage } from '@/app/api/stages/use-update-stage';

interface StageEditFormProps {
  caminoId: string;
  stageNumber: number;
}

interface StageFormValues {
  distance: string;
  description: string;
}

export function StageEditForm({ caminoId, stageNumber }: StageEditFormProps) {
  const t = useTranslations('stage_edit');
  const tCountries = useTranslations('countries');
  const router = useRouter();
  const { data: stage, isLoading, isError } = useStage(caminoId, stageNumber);
  const mutation = useUpdateStage();
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { register, handleSubmit, reset } = useForm<StageFormValues>({
    defaultValues: {
      distance: '',
      description: '',
    },
  });

  useEffect(() => {
    if (stage && !initialized) {
      reset({
        distance: stage.distance !== null ? String(stage.distance) : '',
        description: stage.description ?? '',
      });
      setInitialized(true);
    }
  }, [stage, initialized, reset]);

  const onSubmit = (values: StageFormValues) => {
    setFormError(null);

    const distanceTrimmed = values.distance.trim();
    const descriptionTrimmed = values.description.trim();

    const payload: UpdateStagePayload = {
      distance: distanceTrimmed !== '' ? parseFloat(distanceTrimmed) : null,
      description: descriptionTrimmed !== '' ? descriptionTrimmed : null,
    };

    mutation.mutate(
      { caminoId, stageNumber, payload },
      {
        onSuccess: () => {
          router.push(`/caminos/${caminoId}/stages/${stageNumber}`);
        },
        onError: (err: Error & { status?: number }) => {
          if (err.status === 403) {
            setFormError(t('error_forbidden'));
          } else {
            setFormError(t('error_generic'));
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-8 w-full rounded bg-muted" />
        <div className="h-8 w-full rounded bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
      </div>
    );
  }

  if (isError || !stage) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('error_loading')}
      </p>
    );
  }

  const distanceId = 'stage-distance';
  const descriptionId = 'stage-description';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={t('title', { number: stageNumber })}
      className="space-y-6">
      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {/* Read-only point display */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('start_point_label')}
          </p>
          <p className="mt-1 font-medium">
            {stage.startPoint.name}
            <span className="ml-2 text-sm text-muted-foreground">
              ({tCountries(stage.startPoint.country.toLowerCase())})
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('end_point_label')}
          </p>
          <p className="mt-1 font-medium">
            {stage.endPoint.name}
            <span className="ml-2 text-sm text-muted-foreground">
              ({tCountries(stage.endPoint.country.toLowerCase())})
            </span>
          </p>
        </div>
      </div>

      {/* Distance */}
      <div>
        <Label htmlFor={distanceId}>{t('field_distance')}</Label>
        <div className="mt-1">
          <Input
            id={distanceId}
            type="number"
            step="0.1"
            min="0.1"
            max="9999.9"
            {...register('distance')}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('field_distance_hint')}</p>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor={descriptionId}>{t('field_description')}</Label>
        <div className="mt-1">
          <Textarea id={descriptionId} rows={4} {...register('description')} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={mutation.isPending}
          aria-disabled={mutation.isPending}
          className="w-full sm:w-auto">
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/caminos/${caminoId}/stages/${stageNumber}`)}
          className="w-full sm:w-auto">
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
