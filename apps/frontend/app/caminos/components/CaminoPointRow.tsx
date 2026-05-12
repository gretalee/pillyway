'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Link2Off, X } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/lib/utils';
import {
  CaminoPointSearchResult,
  useCaminoPointsSearch,
} from '@/app/api/caminos/use-camino-points-search';
import { useDebounce } from '@/lib/use-debounce';
import { SuggestionCard } from './SuggestionCard';

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

export interface CaminoPointRowProps {
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

export function CaminoPointRow({
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

  const searchKey =
    !isLinked && currentName.length >= 2 && currentCountry.length > 0
      ? `${currentName}::${currentCountry}`
      : '';

  const debouncedSearchKey = useDebounce(searchKey, 400);

  const [dismissedKey, setDismissedKey] = useState<string>('');

  const showSuggestion = debouncedSearchKey !== '' && debouncedSearchKey !== dismissedKey;

  const { data: searchResults, isError: searchError } = useCaminoPointsSearch(
    showSuggestion ? debouncedSearchKey : '',
  );

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

      <input type="hidden" {...register(`caminoPoints.${index}.caminoPointId`)} />

      {/* Name */}
      <div className="mb-3">
        <div className="flex items-center gap-0.5">
          <Label htmlFor={nameId}>{t('point_name')}</Label>
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
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
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
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
