'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useUpdateSight } from '@/app/api/sights/use-update-sight';
import { useUploadImages } from '@/app/api/waypoints/use-upload-images';
import type { SightDetail } from '@/app/api/sights/sight-types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';

interface EditSightFormProps {
  slug: string;
  sight: SightDetail;
}

interface UploadError extends Error {
  isTooBig?: boolean;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [removedUrls, setRemovedUrls] = useState<Set<string>>(new Set());
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const uploadMutation = useUploadImages();

  const nameId = 'edit-sight-name';
  const descriptionId = 'edit-sight-description';
  const addressId = 'edit-sight-address';
  const latitudeId = 'edit-sight-latitude';
  const longitudeId = 'edit-sight-longitude';
  const imagesId = 'edit-sight-images';

  const visibleExistingImages = sight.imageUrls.filter((url) => !removedUrls.has(url));

  function handleRemoveExistingImage(url: string) {
    setRemovedUrls((prev) => new Set([...prev, url]));
  }

  function handleRemoveUploadedImage(url: string) {
    setUploadedUrls((prev) => prev.filter((u) => u !== url));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadError(null);
    setSelectedFileNames(files.map((f) => f.name));

    uploadMutation.mutate(files, {
      onSuccess: (data) => {
        setUploadedUrls((prev) => [...prev, ...data.urls]);
        setSelectedFileNames([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: (err: UploadError) => {
        setUploadError(err.isTooBig ? tNew('error_upload_size') : tNew('error_upload'));
        setSelectedFileNames([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const onSubmit = (values: FormValues) => {
    setFormError(null);

    const latFilled = values.latitude.trim() !== '';
    const lonFilled = values.longitude.trim() !== '';

    if (latFilled !== lonFilled) {
      const errorMsg = tNew('error_lat_lon_incomplete');
      if (!latFilled) setError('latitude', { message: errorMsg });
      if (!lonFilled) setError('longitude', { message: errorMsg });
      return;
    }

    const latitude = latFilled ? parseFloat(values.latitude) : null;
    const longitude = lonFilled ? parseFloat(values.longitude) : null;

    const imagesChanged = removedUrls.size > 0 || uploadedUrls.length > 0;
    const finalImages = [...visibleExistingImages, ...uploadedUrls];

    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      address: values.address.trim() || null,
      latitude,
      longitude,
      ...(imagesChanged ? { imageUrls: finalImages } : {}),
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        router.push(`/waypoints/${slug}`);
      },
      onError: (err) => {
        const status = (err as Error & { status?: number }).status;
        setFormError(status === 403 ? tEdit('error_forbidden') : tEdit('error_generic'));
      },
    });
  };

  const isPending = updateMutation.isPending;
  const isUploading = uploadMutation.isPending;

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
            {...register('name', {
              required: tNew('error_name_required'),
              validate: (value) => value.trim().length > 0 || tNew('error_name_required'),
            })}
          />
        </div>
        {errors.name && (
          <p
            id={`${nameId}-error`}
            role="alert"
            className="mt-1 text-sm text-destructive">
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
                  return !isNaN(parseFloat(val)) || tNew('error_lat_lon_incomplete');
                },
              })}
            />
          </div>
          {errors.latitude && (
            <p
              id={`${latitudeId}-error`}
              role="alert"
              className="mt-1 text-sm text-destructive">
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
                  return !isNaN(parseFloat(val)) || tNew('error_lat_lon_incomplete');
                },
              })}
            />
          </div>
          {errors.longitude && (
            <p
              id={`${longitudeId}-error`}
              role="alert"
              className="mt-1 text-sm text-destructive">
              {errors.longitude.message}
            </p>
          )}
        </div>
      </div>

      {/* Images */}
      <div>
        <p className="text-sm font-medium text-foreground">{tNew('field_images')}</p>

        {visibleExistingImages.length === 0 && uploadedUrls.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {tEdit('images_empty_state')}
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-3">
            {visibleExistingImages.map((url) => (
              <li key={url} className="relative">
                <Image
                  src={url}
                  alt=""
                  width={96}
                  height={96}
                  className="size-24 rounded-md object-cover"
                  loading="eager"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(url)}
                  aria-label={tEdit('remove_image_label')}
                  className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <i className="icon-times text-lg" aria-hidden="true" />
                </button>
              </li>
            ))}
            {uploadedUrls.map((url) => (
              <li key={url} className="relative">
                <Image
                  src={url}
                  alt=""
                  width={96}
                  height={96}
                  className="size-24 rounded-md object-cover"
                  loading="eager"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => handleRemoveUploadedImage(url)}
                  aria-label={tEdit('remove_image_label')}
                  className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <i className="icon-times text-lg" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <Label htmlFor={imagesId}>{tNew('upload_button')}</Label>
          <div className="mt-1">
            <input
              ref={fileInputRef}
              id={imagesId}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{tNew('upload_hint')}</p>

          {isUploading && (
            <p
              className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"
              aria-live="polite">
              <i className="icon-spinner text-lg animate-spin" aria-hidden="true" />
              {tNew('uploading')}
            </p>
          )}

          {!isUploading && selectedFileNames.length > 0 && !uploadError && (
            <ul className="mt-2 space-y-0.5" aria-live="polite">
              {selectedFileNames.map((name) => (
                <li key={name} className="text-xs text-muted-foreground">
                  {name}
                </li>
              ))}
            </ul>
          )}

          {uploadError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isPending || isUploading}
          aria-disabled={isPending || isUploading}
          className="w-full sm:w-auto">
          {isPending ? (
            <>
              <i className="icon-spinner mr-2 text-xl animate-spin" aria-hidden="true" />
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
