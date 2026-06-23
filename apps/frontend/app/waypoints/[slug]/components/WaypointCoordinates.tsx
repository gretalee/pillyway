'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useUpdateWaypoint } from '@/app/api/waypoints/use-update-waypoint';
import { EditConfirmDialog } from './EditConfirmDialog';

interface Props {
  slug: string;
  lat: number | null;
  lng: number | null;
  canContribute: boolean;
}

interface CoordFormValues {
  lat: string;
  lng: string;
}

export function WaypointCoordinates({ slug, lat, lng, canContribute }: Props) {
  const t = useTranslations('waypoint_detail');
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const mutation = useUpdateWaypoint(slug);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CoordFormValues>({
    defaultValues: {
      lat: lat !== null ? String(lat) : '',
      lng: lng !== null ? String(lng) : '',
    },
  });

  function onRequestEdit() {
    setIsConfirming(true);
  }

  function onConfirmEdit() {
    setIsConfirming(false);
    reset({ lat: lat !== null ? String(lat) : '', lng: lng !== null ? String(lng) : '' });
    setSaveError(null);
    setIsEditing(true);
  }

  function onCancelConfirm() {
    setIsConfirming(false);
  }

  function onCancel() {
    setIsEditing(false);
    setSaveError(null);
  }

  function onSubmit(values: CoordFormValues) {
    const hasLat = values.lat.trim() !== '';
    const hasLng = values.lng.trim() !== '';

    if (hasLat !== hasLng) {
      if (!hasLat) setError('lat', { message: t('error_lat_lng_incomplete') });
      if (!hasLng) setError('lng', { message: t('error_lat_lng_incomplete') });
      return;
    }

    const payload = {
      lat: hasLat ? parseFloat(values.lat) : null,
      lng: hasLng ? parseFloat(values.lng) : null,
    };

    setSaveError(null);
    mutation.mutate(payload, {
      onSuccess: () => {
        setIsEditing(false);
        router.refresh();
      },
      onError: () => {
        setSaveError(t('error_save_coordinates'));
      },
    });
  }

  const latId = 'waypoint-lat';
  const lngId = 'waypoint-lng';

  return (
    <>
      <EditConfirmDialog
        open={isConfirming}
        onConfirm={onConfirmEdit}
        onCancel={onCancelConfirm}
      />

      <section className="mt-6" aria-labelledby="coordinates-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="coordinates-heading" className="text-base font-semibold">
            {t('coordinates_heading')}
          </h2>
          {canContribute && !isEditing && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('edit_coordinates_label')}
              onClick={onRequestEdit}>
              <i
                className="icon-pencil text-muted-foreground hover:text-accent-foreground"
                aria-hidden="true"
              />
            </Button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 space-y-3">
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={latId}>{t('field_lat')}</Label>
                <div className="mt-1">
                  <Input
                    id={latId}
                    type="text"
                    inputMode="decimal"
                    aria-invalid={errors.lat !== undefined}
                    aria-describedby={errors.lat ? `${latId}-error` : undefined}
                    {...register('lat', {
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
                {errors.lat && (
                  <p
                    id={`${latId}-error`}
                    role="alert"
                    className="mt-1 text-xs text-destructive">
                    {errors.lat.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor={lngId}>{t('field_lng')}</Label>
                <div className="mt-1">
                  <Input
                    id={lngId}
                    type="text"
                    inputMode="decimal"
                    aria-invalid={errors.lng !== undefined}
                    aria-describedby={errors.lng ? `${lngId}-error` : undefined}
                    {...register('lng', {
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
                {errors.lng && (
                  <p
                    id={`${lngId}-error`}
                    role="alert"
                    className="mt-1 text-xs text-destructive">
                    {errors.lng.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={mutation.isPending}
                aria-disabled={mutation.isPending}>
                {t('save_coordinates')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onCancel}>
                {t('cancel_coordinates')}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-1 text-base">
            {lat !== null && lng !== null ? `${lat}, ${lng}` : t('coordinates_none')}
          </p>
        )}
      </section>
    </>
  );
}
