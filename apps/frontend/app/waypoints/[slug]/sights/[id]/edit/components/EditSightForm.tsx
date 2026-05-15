'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { useUpdateSight } from '@/app/api/sights/use-update-sight';
import type { SightDetail } from '@/app/api/sights/sight-types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';

interface EditSightFormProps {
  slug: string;
  sight: SightDetail;
}

interface FormValues {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
}

export function EditSightForm({ slug, sight }: EditSightFormProps) {
  const tEdit = useTranslations('sight_edit');
  const tNew = useTranslations('sight_new');
  const router = useRouter();

  const [removeImageUrls, setRemoveImageUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      name: sight.name,
      description: sight.description ?? '',
      address: sight.address ?? '',
      latitude: sight.latitude !== null ? String(sight.latitude) : '',
      longitude: sight.longitude !== null ? String(sight.longitude) : '',
    },
  });

  const updateMutation = useUpdateSight(sight.id, sight.caminoPointId);

  const nameId = 'edit-sight-name';
  const descriptionId = 'edit-sight-description';
  const addressId = 'edit-sight-address';
  const latitudeId = 'edit-sight-latitude';
  const longitudeId = 'edit-sight-longitude';

  const visibleExistingImages = sight.imageUrls.filter((url) => !removeImageUrls.includes(url));

  function handleRemoveExistingImage(url: string) {
    setRemoveImageUrls((prev) => [...prev, url]);
  }

  const onSubmit = (values: FormValues) => {
    setFormError(null);

    const latFilled = values.latitude.trim() !== '';
    const lonFilled = values.longitude.trim() !== '';

    if (latFilled !== lonFilled) {
      const errorMsg = tNew('error_lat_lon_incomplete');
      if (!latFilled) {
        setError('latitude', { message: errorMsg });
      }
      if (!lonFilled) {
        setError('longitude', { message: errorMsg });
      }
      return;
    }

    const latitude = latFilled ? parseFloat(values.latitude) : undefined;
    const longitude = lonFilled ? parseFloat(values.longitude) : undefined;

    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      address: values.address.trim() || null,
      ...(latitude !== undefined ? { latitude } : { latitude: null }),
      ...(longitude !== undefined ? { longitude } : { longitude: null }),
      ...(removeImageUrls.length > 0 ? { removeImageUrls } : {}),
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        router.push(`/waypoints/${slug}`);
      },
      onError: (err) => {
        const status = (err as Error & { status?: number }).status;
        if (status === 403) {
          setFormError(tEdit('error_forbidden'));
        } else {
          setFormError(tEdit('error_generic'));
        }
      },
    });
  };

  const isPending = updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {/* Name */}
      <div>
        <Label htmlFor={nameId}>{tNew('field_name')}</Label>
        <div className="mt-1">
          <Input
            id={nameId}
            type="text"
            aria-required="true"
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            aria-invalid={errors.name ? 'true' : undefined}
            {...register('name', { required: tNew('error_name_required') })}
          />
        </div>
        {errors.name && (
          <p id={`${nameId}-error`} role="alert" className="mt-1 text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor={descriptionId}>{tNew('field_description')}</Label>
        <div className="mt-1">
          <Textarea id={descriptionId} rows={4} {...register('description')} />
        </div>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor={addressId}>{tNew('field_address')}</Label>
        <div className="mt-1">
          <Input id={addressId} type="text" {...register('address')} />
        </div>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={latitudeId}>{tNew('field_latitude')}</Label>
          <div className="mt-1">
            <Input
              id={latitudeId}
              type="number"
              step="any"
              aria-describedby={errors.latitude ? `${latitudeId}-error` : undefined}
              aria-invalid={errors.latitude ? 'true' : undefined}
              {...register('latitude', {
                validate: (val) => {
                  if (val.trim() === '') return true;
                  const num = parseFloat(val);
                  if (isNaN(num)) return tNew('error_lat_lon_incomplete');
                  return true;
                },
              })}
            />
          </div>
          {errors.latitude && (
            <p id={`${latitudeId}-error`} role="alert" className="mt-1 text-sm text-destructive">
              {errors.latitude.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={longitudeId}>{tNew('field_longitude')}</Label>
          <div className="mt-1">
            <Input
              id={longitudeId}
              type="number"
              step="any"
              aria-describedby={errors.longitude ? `${longitudeId}-error` : undefined}
              aria-invalid={errors.longitude ? 'true' : undefined}
              {...register('longitude', {
                validate: (val) => {
                  if (val.trim() === '') return true;
                  const num = parseFloat(val);
                  if (isNaN(num)) return tNew('error_lat_lon_incomplete');
                  return true;
                },
              })}
            />
          </div>
          {errors.longitude && (
            <p id={`${longitudeId}-error`} role="alert" className="mt-1 text-sm text-destructive">
              {errors.longitude.message}
            </p>
          )}
        </div>
      </div>

      {/* Existing images with remove button */}
      <div>
        <p className="text-sm font-medium text-foreground">{tNew('field_images')}</p>
        {visibleExistingImages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{tEdit('images_empty_state')}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-3" aria-label={tEdit('remove_image_label')}>
            {visibleExistingImages.map((url) => (
              <li key={url} className="relative">
                <img
                  src={url}
                  alt=""
                  className="size-24 rounded-md object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(url)}
                  aria-label={tEdit('remove_image_label')}
                  className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          aria-disabled={isPending}
          className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {tEdit('submitting')}
            </>
          ) : (
            tEdit('submit_label')
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/waypoints/${slug}`)}
          className="w-full sm:w-auto">
          {tEdit('cancel')}
        </Button>
      </div>
    </form>
  );
}
