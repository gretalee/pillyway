'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
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
import { Button, buttonVariants } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

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
  canRemove?: boolean;
  waypointSlug?: string;
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
  canRemove = true,
  waypointSlug,
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
  const [pendingRemove, setPendingRemove] = useState(false);

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
  const pointLatError = errors.caminoPoints?.[index]?.lat;
  const pointLngError = errors.caminoPoints?.[index]?.lng;
  const nameId = `point-name-${index}`;
  const countryId = `point-country-${index}`;
  const descriptionId = `point-description-${index}`;
  const latId = `point-lat-${index}`;
  const lngId = `point-lng-${index}`;

  return (
    <>
      <AlertDialog open={pendingRemove} onOpenChange={(open) => { if (!open) setPendingRemove(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('remove_point_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('remove_point_confirm_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRemove(false)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => { setPendingRemove(false); onRemove(index); }}>
              {t('remove_point_confirm_action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
          {index + 1}.
        </span>
        <div className="flex items-center">
          {waypointSlug && (
            <Link
              href={`/waypoints/${waypointSlug}`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
              aria-label={t('point_waypoint_link')}>
              <i className="icon-pencil" aria-hidden="true" />
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={t('move_up')}>
            <i className="icon-chevron-up" aria-hidden="true" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            aria-label={t('move_down')}>
            <i className="icon-chevron-down" aria-hidden="true" />
          </Button>

          {canRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPendingRemove(true)}
              disabled={totalCount === 1}
              aria-label={t('remove_point')}>
              <i className="icon-times text-xl" aria-hidden="true" />
            </Button>
          )}
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
              <i className="icon-chain-broken text-sm" aria-hidden="true" />
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

      {/* Coordinates */}
      {waypointSlug ? (
        <div className="mt-4">
          <p className="text-sm">{t('point_coordinates_label')}</p>
          <p className="mt-1 text-sm">
            {currentPoint?.lat && currentPoint?.lng ? (
              `${currentPoint.lat}, ${currentPoint.lng}`
            ) : (
              <span className="text-muted-foreground">{t('point_coordinates_none')}</span>
            )}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={latId}>{t('point_lat')}</Label>
            <div className="mt-1">
              <Input
                id={latId}
                type="number"
                step="any"
                aria-describedby={pointLatError ? `${latId}-error` : undefined}
                aria-invalid={pointLatError ? 'true' : undefined}
                {...register(`caminoPoints.${index}.lat`, {
                  validate: (val) => {
                    if (val.trim() === '') return true;
                    const num = parseFloat(val);
                    if (isNaN(num) || num < -90 || num > 90)
                      return t('error_lat_invalid');
                    return true;
                  },
                })}
              />
            </div>
            {pointLatError && (
              <p
                id={`${latId}-error`}
                role="alert"
                className="mt-1 text-xs text-destructive">
                {pointLatError.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor={lngId}>{t('point_lng')}</Label>
            <div className="mt-1">
              <Input
                id={lngId}
                type="number"
                step="any"
                aria-describedby={pointLngError ? `${lngId}-error` : undefined}
                aria-invalid={pointLngError ? 'true' : undefined}
                {...register(`caminoPoints.${index}.lng`, {
                  validate: (val) => {
                    if (val.trim() === '') return true;
                    const num = parseFloat(val);
                    if (isNaN(num) || num < -180 || num > 180)
                      return t('error_lng_invalid');
                    return true;
                  },
                })}
              />
            </div>
            {pointLngError && (
              <p
                id={`${lngId}-error`}
                role="alert"
                className="mt-1 text-xs text-destructive">
                {pointLngError.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
