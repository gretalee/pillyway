'use client';

import { useCallback, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/lib/utils';

import { useCountries } from '@/app/api/use-countries';
import {
  CaminoPointPayload,
  NewPointPayload,
  useCreateCamino,
} from '@/app/api/caminos/use-create-camino';
import { CaminoPointSearchResult } from '@/app/api/caminos/use-camino-points-search';
import { deleteCaminoPicture } from '@/app/api/camino-pictures/use-delete-camino-picture';
import { CaminoPictureUploadSection } from './CaminoPictureUploadSection';
import { CaminoPointRow } from './CaminoPointRow';

interface CaminoPointFormItem {
  caminoPointId: string | null;
  name: string;
  country: string;
  description: string;
  lat: string;
  lng: string;
}

interface CaminoFormValues {
  name: string;
  description: string;
  caminoPoints: CaminoPointFormItem[];
}

export function CreateCaminoForm() {
  const t = useTranslations('caminos_new');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: countries = [], isError: countriesError } = useCountries();
  const mutation = useCreateCamino();
  const isPending = mutation.isPending;
  const { accessTokenEncoded } = useKindeBrowserClient();

  // After the camino is saved, track id (for picture API calls) and slug (for URL navigation)
  const [createdCaminoId, setCreatedCaminoId] = useState<string | null>(null);
  const [createdCaminoSlug, setCreatedCaminoSlug] = useState<string | null>(null);
  // Track ids of pictures uploaded in the pictures step, for cancel cleanup
  const uploadedPictureIdsRef = useRef<string[]>([]);
  const [isCancellingCleanup, setIsCancellingCleanup] = useState(false);

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
      caminoPoints: [{ caminoPointId: null, name: '', country: '', description: '', lat: '', lng: '' }],
    },
  });
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'caminoPoints',
  });
  const watchedPoints = useWatch({ control, name: 'caminoPoints' });
  const [formError, setFormError] = useState<string | null>(null);

  const onLinkCaminoPoints = useCallback(
    (index: number, suggestion: CaminoPointSearchResult) => {
      setValue(`caminoPoints.${index}.caminoPointId`, suggestion.id, {
        shouldValidate: true,
      });
      setValue(`caminoPoints.${index}.name`, suggestion.name, {
        shouldValidate: true,
      });
      setValue(`caminoPoints.${index}.description`, suggestion.description ?? '', {
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const onUnlinkCaminoPoints = useCallback(
    (index: number) => {
      setValue(`caminoPoints.${index}.caminoPointId`, null, {
        shouldValidate: false,
      });
    },
    [setValue],
  );

  const onAddCaminoPoint = () => {
    append({ caminoPointId: null, name: '', country: '', description: '', lat: '', lng: '' });
  };

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
      const lat = p.lat.trim() !== '' ? parseFloat(p.lat) : undefined;
      const lng = p.lng.trim() !== '' ? parseFloat(p.lng) : undefined;
      if (lat !== undefined) newPoint.lat = lat;
      if (lng !== undefined) newPoint.lng = lng;
      return newPoint;
    });

    const payload = {
      name: values.name,
      caminoPoints,
      ...(values.description.trim() !== '' && { description: values.description.trim() }),
    };

    mutation.mutate(payload, {
      onSuccess: (created) => {
        void queryClient.invalidateQueries({ queryKey: ['caminos'] });
        // Move to the pictures step — user can now add pictures or go straight to the camino
        setCreatedCaminoId(created.id);
        setCreatedCaminoSlug(created.slug);
      },
      onError: (err: Error & { status?: number }) => {
        if (err.status === 409) {
          setFormError(t('error_conflict'));
        } else {
          setFormError(t('error_generic'));
        }
      },
    });
  };

  const nameId = 'camino-name';
  const descriptionId = 'camino-description';

  async function handleCancelAfterCreation() {
    if (!createdCaminoId) {
      router.push('/caminos');
      return;
    }

    const pictureIds = uploadedPictureIdsRef.current;
    if (pictureIds.length === 0) {
      router.push('/caminos');
      return;
    }

    setIsCancellingCleanup(true);

    const token = accessTokenEncoded ?? '';
    const TIMEOUT_MS = 10_000;

    await Promise.allSettled(
      pictureIds.map((pictureId) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        return deleteCaminoPicture(
          createdCaminoId,
          pictureId,
          token,
          controller.signal,
        ).finally(() => clearTimeout(timer));
      }),
    );

    // Navigate away regardless of outcome
    router.push('/caminos');
  }

  if (countriesError) {
    return (
      <p role="alert" className="text-destructive">
        {t('error_generic')}
      </p>
    );
  }

  // Pictures step — shown after the camino is successfully created
  if (createdCaminoId !== null) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {t('pictures_step_heading')}
          </h2>
          <CaminoPictureUploadSection
            caminoId={createdCaminoId}
            onUploadSuccess={(result) => {
              uploadedPictureIdsRef.current = [
                ...uploadedPictureIdsRef.current,
                result.id,
              ];
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => router.push(`/caminos/${createdCaminoSlug ?? createdCaminoId}`)}
            className="w-full sm:w-auto">
            {t('view_camino')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isCancellingCleanup}
            aria-disabled={isCancellingCleanup}
            onClick={() => void handleCancelAfterCreation()}
            className="w-full sm:w-auto">
            {isCancellingCleanup ? (
              <>
                <i
                  className="icon-spinner mr-2 text-xl animate-spin"
                  aria-hidden="true"
                />
                {t('submitting')}
              </>
            ) : (
              t('cancel')
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
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

      {/* Camino name */}
      <div>
        <div className="flex items-center gap-0.5">
          <Label htmlFor={nameId}>{t('field_name')}</Label>
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </div>
        <div className="mt-1">
          <Input
            id={nameId}
            aria-invalid={errors.name !== undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            {...register('name', { required: t('error_name_required') })}
          />
        </div>
        {errors.name && (
          <p
            id={`${nameId}-error`}
            role="alert"
            className="mt-1 text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Camino description */}
      <div>
        <Label htmlFor={descriptionId}>{t('field_description')}</Label>
        <div className="mt-1">
          <Textarea id={descriptionId} rows={3} {...register('description')} />
        </div>
      </div>

      {/* CaminoPoints */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {t('title_points')}
        </h2>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <CaminoPointRow
              key={field.id}
              index={index}
              totalCount={fields.length}
              countries={countries}
              register={register}
              errors={errors}
              onRemove={(i) => {
                if (fields.length > 1) {
                  remove(i);
                }
              }}
              onMoveUp={(i) => {
                if (i > 0) {
                  move(i, i - 1);
                }
              }}
              onMoveDown={(i) => {
                if (i < fields.length - 1) {
                  move(i, i + 1);
                }
              }}
              onLink={onLinkCaminoPoints}
              onUnlink={onUnlinkCaminoPoints}
              watchedPoints={watchedPoints ?? []}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onAddCaminoPoint}
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2',
            'text-sm font-medium text-muted-foreground transition-colors',
            'hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}>
          {t('add_point')}
        </button>
      </div>

      {/* Submit */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={!isValid || isPending}
          aria-disabled={!isValid || isPending}
          className="w-full sm:w-auto">
          {isPending ? (
            <>
              <i className="icon-spinner mr-2 text-xl animate-spin" aria-hidden="true" />
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
            router.push('/caminos');
          }}
          className="w-full sm:w-auto">
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
