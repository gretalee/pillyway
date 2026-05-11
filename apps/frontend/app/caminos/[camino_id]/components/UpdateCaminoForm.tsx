'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/app/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { useCountries } from '@/app/api/use-countries';
import { CaminoPointPayload, NewPointPayload } from '@/app/api/use-create-camino';
import { CaminoPointSearchResult } from '@/app/api/use-camino-points-search';
import { useCamino } from '@/app/api/use-camino';
import { useUpdateCamino, UpdateCaminoPayload } from '@/app/api/use-update-camino';
import { useStages } from '@/app/api/use-stages';
import { CaminoPointRow } from '../../components/CaminoPointRow';

interface CaminoPointFormItem {
  caminoPointId: string | null;
  name: string;
  country: string;
  description: string;
}

interface CaminoFormValues {
  name: string;
  description: string;
  caminoPoints: CaminoPointFormItem[];
}

interface UpdateCaminoFormProps {
  caminoId: string;
}

export function UpdateCaminoForm({ caminoId }: UpdateCaminoFormProps) {
  const t = useTranslations('caminos_update');
  const tNew = useTranslations('caminos_new');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: countries = [], isError: countriesError } = useCountries();
  const { data: camino, isLoading, isError: caminoError } = useCamino(caminoId);
  const { data: stages } = useStages(caminoId);
  const mutation = useUpdateCamino();

  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<UpdateCaminoPayload | null>(null);
  const [reorderWarningCount, setReorderWarningCount] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<CaminoFormValues>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      caminoPoints: [{ caminoPointId: null, name: '', country: '', description: '' }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'caminoPoints' });
  const watchedPoints = useWatch({ control, name: 'caminoPoints' });

  // Pre-populate form once camino data is loaded
  useEffect(() => {
    if (camino && !initialized) {
      reset({
        name: camino.name,
        description: camino.description ?? '',
        caminoPoints: camino.caminoPoints.map((p) => ({
          caminoPointId: p.id,
          name: p.name,
          country: p.country,
          description: p.description ?? '',
        })),
      });
      setInitialized(true);
    }
  }, [camino, initialized, reset]);

  const onLinkCaminoPoints = useCallback(
    (index: number, suggestion: CaminoPointSearchResult) => {
      setValue(`caminoPoints.${index}.caminoPointId`, suggestion.id, { shouldValidate: true });
      setValue(`caminoPoints.${index}.name`, suggestion.name, { shouldValidate: true });
      setValue(`caminoPoints.${index}.description`, suggestion.description ?? '', {
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const onUnlinkCaminoPoints = useCallback(
    (index: number) => {
      setValue(`caminoPoints.${index}.caminoPointId`, null, { shouldValidate: false });
    },
    [setValue],
  );

  function executeMutation(payload: UpdateCaminoPayload) {
    mutation.mutate(
      { id: caminoId, payload },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['caminos'] });
          void queryClient.invalidateQueries({ queryKey: ['camino', caminoId] });
          router.push(`/caminos/${caminoId}`);
        },
        onError: (err: Error & { status?: number }) => {
          if (err.status === 409) {
            setFormError(t('error_conflict'));
          } else if (err.status === 403) {
            setFormError(t('error_forbidden'));
          } else {
            setFormError(t('error_generic'));
          }
        },
      },
    );
  }

  const onSubmit = (values: CaminoFormValues) => {
    setFormError(null);

    const caminoPoints: CaminoPointPayload[] = values.caminoPoints.map((p) => {
      if (p.caminoPointId) {
        return { caminoPointId: p.caminoPointId };
      }
      const newPoint: NewPointPayload = { name: p.name, country: p.country };
      if (p.description.trim() !== '') {
        newPoint.description = p.description.trim();
      }
      return newPoint;
    });

    const payload: UpdateCaminoPayload = {
      name: values.name,
      description: values.description.trim() || null,
      caminoPoints,
    };

    // Reorder warning: check if any departing stage pairs have enriched data.
    // Graceful degradation: if stages data is unavailable, skip the check and submit immediately.
    if (stages && stages.length > 0) {
      // Build a set key from startPointId + endPointId for efficient lookup
      const newPointIds = values.caminoPoints
        .map((p) => p.caminoPointId)
        .filter((id): id is string => id !== null);

      const newPairKeys = new Set<string>();
      for (let i = 0; i < newPointIds.length - 1; i++) {
        newPairKeys.add(`${newPointIds[i]}:${newPointIds[i + 1]}`);
      }

      const departingWithData = stages.filter((s) => {
        const key = `${s.startPoint.id}:${s.endPoint.id}`;
        const isLeaving = !newPairKeys.has(key);
        const hasData = s.distance !== null || s.description !== null;
        return isLeaving && hasData;
      });

      if (departingWithData.length > 0) {
        setPendingPayload(payload);
        setReorderWarningCount(departingWithData.length);
        return;
      }
    }

    executeMutation(payload);
  };

  function handleConfirmReorder() {
    if (!pendingPayload) return;
    const payload = pendingPayload;
    setPendingPayload(null);
    setReorderWarningCount(0);
    executeMutation(payload);
  }

  function handleCancelReorder() {
    setPendingPayload(null);
    setReorderWarningCount(0);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-8 w-full rounded bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
        <div className="h-32 w-full rounded bg-muted" />
      </div>
    );
  }

  if (caminoError || !camino) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-destructive">
          {t('error_loading')}
        </p>
        <Link href="/caminos" className="text-sm underline underline-offset-4 hover:text-foreground">
          {t('back_to_caminos')}
        </Link>
      </div>
    );
  }

  if (countriesError) {
    return (
      <p role="alert" className="text-destructive">
        {t('error_generic')}
      </p>
    );
  }

  const nameId = 'camino-name';
  const descriptionId = 'camino-description';

  return (
    <>
      <AlertDialog open={pendingPayload !== null} onOpenChange={(isOpen) => { if (!isOpen) handleCancelReorder(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reorder_warning_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('reorder_warning_body', { count: reorderWarningCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReorder}>
              {t('reorder_warning_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReorder}>
              {t('reorder_warning_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label={t('title')}
        className="space-y-6">
        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div>
          <div className="flex items-center gap-0.5">
            <Label htmlFor={nameId}>{tNew('field_name')}</Label>
            <span aria-hidden="true" className="text-destructive">*</span>
          </div>
          <div className="mt-1">
            <Input
              id={nameId}
              aria-invalid={errors.name !== undefined}
              aria-describedby={errors.name ? `${nameId}-error` : undefined}
              {...register('name', { required: tNew('error_name_required') })}
            />
          </div>
          {errors.name && (
            <p id={`${nameId}-error`} role="alert" className="mt-1 text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor={descriptionId}>{tNew('field_description')}</Label>
          <div className="mt-1">
            <Textarea id={descriptionId} rows={3} {...register('description')} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">{tNew('title_points')}</h2>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <CaminoPointRow
                key={field.id}
                index={index}
                totalCount={fields.length}
                countries={countries}
                register={register}
                errors={errors}
                onRemove={(i) => { if (fields.length > 1) remove(i); }}
                onMoveUp={(i) => { if (i > 0) move(i, i - 1); }}
                onMoveDown={(i) => { if (i < fields.length - 1) move(i, i + 1); }}
                onLink={onLinkCaminoPoints}
                onUnlink={onUnlinkCaminoPoints}
                watchedPoints={watchedPoints ?? []}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => append({ caminoPointId: null, name: '', country: '', description: '' })}
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2',
              'text-sm font-medium text-muted-foreground transition-colors',
              'hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}>
            {tNew('add_point')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={!isValid || mutation.isPending}
            aria-disabled={!isValid || mutation.isPending}
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
            onClick={() => {
              reset();
              router.push(`/caminos/${caminoId}`);
            }}
            className="w-full sm:w-auto">
            {t('cancel')}
          </Button>
        </div>
      </form>
    </>
  );
}
