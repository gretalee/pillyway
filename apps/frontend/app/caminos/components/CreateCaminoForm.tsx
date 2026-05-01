'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Link2Off, Loader2, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Select } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface CaminoPointSearchResult {
  id: string;
  name: string;
  country: string;
  description: string | null;
}

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

type ExistingPointPayload = { caminoPointId: string };
type NewPointPayload = { name: string; country: string; description?: string };
type CaminoPointPayload = ExistingPointPayload | NewPointPayload;

interface CreateCaminoPayload {
  name: string;
  description?: string;
  caminoPoints: CaminoPointPayload[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

async function fetchCountries(): Promise<string[]> {
  const response = await fetch(`${API_URL}/countries`);
  if (!response.ok) {
    throw new Error('Failed to fetch countries');
  }
  return response.json() as Promise<string[]>;
}

async function searchCaminoPoints(
  name: string,
  country: string,
): Promise<CaminoPointSearchResult[]> {
  const params = new URLSearchParams({ name, country });
  const response = await fetch(`${API_URL}/camino-points/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return response.json() as Promise<CaminoPointSearchResult[]>;
}

async function createCamino(payload: CreateCaminoPayload, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/caminos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const status = response.status;
    throw Object.assign(new Error('Create failed'), { status });
  }
}

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: CaminoPointSearchResult;
  onYes: (suggestion: CaminoPointSearchResult) => void;
  onNo: () => void;
}

function SuggestionCard({ suggestion, onYes, onNo }: SuggestionCardProps) {
  const t = useTranslations('caminos_new');

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-sm font-medium text-foreground">{t('suggestion.prompt')}</p>
      <p className="mb-1 text-sm font-semibold text-foreground">{suggestion.name}</p>
      {suggestion.description && (
        <p className="mb-3 text-xs text-muted-foreground">{suggestion.description}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onYes(suggestion)}
          aria-label={`${t('suggestion.yes')}: ${suggestion.name}`}
          className={cn(
            'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground',
            'transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}>
          {t('suggestion.yes')}
        </button>
        <button
          type="button"
          onClick={onNo}
          aria-label={t('suggestion.no')}
          className={cn(
            'rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground',
            'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}>
          {t('suggestion.no')}
        </button>
      </div>
    </div>
  );
}

// ── CaminoPointRow ────────────────────────────────────────────────────────────

interface CaminoPointRowProps {
  index: number;
  totalCount: number;
  countries: string[];
  register: ReturnType<typeof useForm<CaminoFormValues>>['register'];
  errors: ReturnType<typeof useForm<CaminoFormValues>>['formState']['errors'];
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onLink: (index: number, suggestion: CaminoPointSearchResult) => void;
  onUnlink: (index: number) => void;
  watchedPoints: CaminoPointFormItem[];
}

function CaminoPointRow({
  index,
  totalCount,
  countries,
  register,
  errors,
  onRemove,
  onMoveUp,
  onMoveDown,
  onLink,
  onUnlink,
  watchedPoints,
}: CaminoPointRowProps) {
  const t = useTranslations('caminos_new');
  const tCountries = useTranslations('countries');

  const currentPoint = watchedPoints[index];
  const isLinked =
    currentPoint?.caminoPointId !== null &&
    currentPoint?.caminoPointId !== undefined &&
    currentPoint.caminoPointId !== '';
  const currentName = currentPoint?.name ?? '';
  const currentCountry = currentPoint?.country ?? '';

  // Search trigger: both name (>=2 chars) and country must be filled, and not linked
  const searchKey =
    !isLinked && currentName.length >= 2 && currentCountry.length > 0
      ? `${currentName}::${currentCountry}`
      : '';
  const debouncedSearchKey = useDebounce(searchKey, 400);

  // Dismissed suggestion tracking (per session for this row — reset when searchKey changes)
  const [dismissedKey, setDismissedKey] = useState<string>('');

  const showSuggestion = debouncedSearchKey !== '' && debouncedSearchKey !== dismissedKey;

  const { data: searchResults, isError: searchError } = useQuery({
    queryKey: ['camino-points-search', debouncedSearchKey],
    queryFn: () => {
      const [name, country] = debouncedSearchKey.split('::');
      return searchCaminoPoints(name ?? '', country ?? '');
    },
    enabled: showSuggestion,
    retry: false,
  });

  const firstSuggestion =
    !searchError && showSuggestion && searchResults && searchResults.length > 0
      ? searchResults[0]
      : null;

  const pointNameError = errors.caminoPoints?.[index]?.name;
  const pointCountryError = errors.caminoPoints?.[index]?.country;

  const nameId = `point-name-${index}`;
  const countryId = `point-country-${index}`;
  const descriptionId = `point-description-${index}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {index + 1}.
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={t('move_up')}
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}>
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            aria-label={t('move_down')}
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}>
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={totalCount === 1}
            aria-label={t('remove_point')}
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Hidden caminoPointId field */}
      <input type="hidden" {...register(`caminoPoints.${index}.caminoPointId`)} />

      {/* Name */}
      <div className="mb-3">
        <div className="flex items-center gap-0.5">
          <Label htmlFor={nameId}>{t('point_name')}</Label>
          <span aria-hidden="true" className="text-destructive">*</span>
        </div>
        <div className="relative mt-1">
          <Input
            id={nameId}
            readOnly={isLinked}
            aria-invalid={pointNameError !== undefined}
            aria-describedby={pointNameError ? `${nameId}-error` : undefined}
            className={cn(isLinked && 'bg-muted/50 text-muted-foreground')}
            {...register(`caminoPoints.${index}.name`, {
              required: t('error_point_name'),
            })}
          />
          {isLinked && (
            <button
              type="button"
              onClick={() => onUnlink(index)}
              aria-label={t('unlink')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Link2Off className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        {pointNameError && (
          <p
            id={`${nameId}-error`}
            role="alert"
            className="mt-1 text-xs text-destructive">
            {pointNameError.message}
          </p>
        )}

        {/* Inline suggestion */}
        {firstSuggestion && !isLinked && (
          <SuggestionCard
            suggestion={firstSuggestion}
            onYes={(s) => {
              onLink(index, s);
              setDismissedKey(debouncedSearchKey);
            }}
            onNo={() => setDismissedKey(debouncedSearchKey)}
          />
        )}
      </div>

      {/* Country */}
      <div className="mb-3">
        <div className="flex items-center gap-0.5">
          <Label htmlFor={countryId}>{t('point_country')}</Label>
          <span aria-hidden="true" className="text-destructive">*</span>
        </div>
        <div className="mt-1">
          <Select
            id={countryId}
            aria-invalid={pointCountryError !== undefined}
            aria-describedby={pointCountryError ? `${countryId}-error` : undefined}
            disabled={isLinked}
            {...register(`caminoPoints.${index}.country`, {
              required: t('error_point_country'),
              validate: (val) => val !== '' || t('error_point_country'),
            })}>
            <option value="">{t('point_country')}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {tCountries(c.toLowerCase())}
              </option>
            ))}
          </Select>
        </div>
        {pointCountryError && (
          <p
            id={`${countryId}-error`}
            role="alert"
            className="mt-1 text-xs text-destructive">
            {pointCountryError.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor={descriptionId}>{t('point_description')}</Label>
        <div className="mt-1">
          <Input
            id={descriptionId}
            readOnly={isLinked}
            className={cn(isLinked && 'bg-muted/50 text-muted-foreground')}
            {...register(`caminoPoints.${index}.description`)}
          />
        </div>
      </div>
    </div>
  );
}

// ── CreateCaminoForm ──────────────────────────────────────────────────────────

export function CreateCaminoForm() {
  const t = useTranslations('caminos_new');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
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

  // Countries list
  const { data: countries = [], isError: countriesError } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: Infinity,
  });

  // Submission mutation
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: CaminoFormValues) => {
      const token = accessTokenEncoded ?? '';
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

      const payload: CreateCaminoPayload = {
        name: values.name,
        caminoPoints,
      };
      if (values.description.trim() !== '') {
        payload.description = values.description.trim();
      }

      await createCamino(payload, token);
    },
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

  const isPending = mutation.isPending;

  const handleLink = useCallback(
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

  const handleUnlink = useCallback(
    (index: number) => {
      setValue(`caminoPoints.${index}.caminoPointId`, null, {
        shouldValidate: false,
      });
    },
    [setValue],
  );

  const handleAddPoint = () => {
    append({ caminoPointId: null, name: '', country: '', description: '' });
  };

  const onSubmit = (values: CaminoFormValues) => {
    setFormError(null);
    mutation.mutate(values);
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
      {/* Form-level error */}
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
          <span aria-hidden="true" className="text-destructive">*</span>
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
              onLink={handleLink}
              onUnlink={handleUnlink}
              watchedPoints={watchedPoints ?? []}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddPoint}
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
