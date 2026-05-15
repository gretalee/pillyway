'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCreateSight } from '@/app/api/waypoints/use-create-sight';
import { useUploadImages } from '@/app/api/waypoints/use-upload-images';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';

interface AddSightFormProps {
  slug: string;
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

export function AddSightForm({ slug }: AddSightFormProps) {
  const t = useTranslations('sight_new');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [collectedImageUrls, setCollectedImageUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
    },
  });

  const createMutation = useCreateSight(slug);
  const uploadMutation = useUploadImages();

  const nameId = 'sight-name';
  const descriptionId = 'sight-description';
  const addressId = 'sight-address';
  const latitudeId = 'sight-latitude';
  const longitudeId = 'sight-longitude';
  const imagesId = 'sight-images';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadError(null);
    setSelectedFileNames(files.map((f) => f.name));

    uploadMutation.mutate(files, {
      onSuccess: (data) => {
        setCollectedImageUrls((prev) => [...prev, ...data.urls]);
      },
      onError: (err: UploadError) => {
        if (err.isTooBig) {
          setUploadError(t('error_upload_size'));
        } else {
          setUploadError(t('error_upload'));
        }
        setSelectedFileNames([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const onSubmit = (values: FormValues) => {
    setFormError(null);

    const latFilled = values.latitude.trim() !== '';
    const lonFilled = values.longitude.trim() !== '';

    if (latFilled !== lonFilled) {
      const errorMsg = t('error_lat_lon_incomplete');
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
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(collectedImageUrls.length > 0 ? { imageUrls: collectedImageUrls } : {}),
      ...(values.address.trim() ? { address: values.address.trim() } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        router.push(`/waypoints/${slug}`);
      },
      onError: () => {
        setFormError(t('error_generic'));
      },
    });
  };

  const isPending = createMutation.isPending;
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
        <Label htmlFor={nameId}>{t('field_name')}</Label>
        <div className="mt-1">
          <Input
            id={nameId}
            type="text"
            aria-required="true"
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            aria-invalid={errors.name ? 'true' : undefined}
            {...register('name', {
              required: t('error_name_required'),
              validate: (value) => value.trim().length > 0 || t('error_name_required'),
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
        <Label htmlFor={descriptionId}>{t('field_description')}</Label>
        <div className="mt-1">
          <Textarea id={descriptionId} rows={4} {...register('description')} />
        </div>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor={addressId}>{t('field_address')}</Label>
        <div className="mt-1">
          <Input id={addressId} type="text" {...register('address')} />
        </div>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={latitudeId}>{t('field_latitude')}</Label>
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
                  if (isNaN(num)) return t('error_lat_lon_incomplete');
                  return true;
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
          <Label htmlFor={longitudeId}>{t('field_longitude')}</Label>
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
                  if (isNaN(num)) return t('error_lat_lon_incomplete');
                  return true;
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
        <Label htmlFor={imagesId}>{t('field_images')}</Label>
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
        <p className="mt-1 text-xs text-muted-foreground">{t('upload_hint')}</p>

        {isUploading && (
          <p
            className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"
            aria-live="polite">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            {t('uploading')}
          </p>
        )}

        {!isUploading && selectedFileNames.length > 0 && !uploadError && (
          <ul className="mt-2 space-y-0.5" aria-live="polite">
            {selectedFileNames.map((fileName) => (
              <li key={fileName} className="text-xs text-muted-foreground">
                {fileName}
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

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isPending || isUploading}
          aria-disabled={isPending || isUploading}
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
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/waypoints/${slug}`)}
          className="w-full sm:w-auto">
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
