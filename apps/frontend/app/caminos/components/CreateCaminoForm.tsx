'use client';

import { useCallback, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
} from '@/app/api/use-create-camino';
import { CaminoPointRow } from './CaminoPointRow';

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

export function CreateCaminoForm() {
  const t = useTranslations('caminos_new');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: countries = [], isError: countriesError } = useCountries();
  const mutation = useCreateCamino();
  const isPending = mutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<CaminoFormValues>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      caminoPoints: [{ caminoPointId: null, name: '', country: '', description: '' }],
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
    append({ caminoPointId: null, name: '', country: '', description: '' });
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
      return newPoint;
    });

    const payload = {
      name: values.name,
      caminoPoints,
      ...(values.description.trim() !== '' && { description: values.description.trim() }),
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['caminos'] });
        router.push('/caminos');
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

  if (countriesError) {
    return (
      <p role="alert" className="text-destructive">
        {t('error_generic')}
      </p>
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
      <div>
        <Button
          type="submit"
          disabled={!isValid || isPending}
          aria-disabled={!isValid || isPending}
          className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </div>
    </form>
  );
}
