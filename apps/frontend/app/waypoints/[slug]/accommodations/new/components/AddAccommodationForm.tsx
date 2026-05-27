'use client';

import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateAccommodation } from '@/app/api/waypoints/use-create-accommodation';
import { useUploadImages } from '@/app/api/waypoints/use-upload-images';
import type {
  AccommodationType,
  PriceRange,
} from '@/app/api/accommodations/accommodation-types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { useCountries } from '@/app/api/use-countries';

interface AddAccommodationFormProps {
  slug: string;
}

interface UploadError extends Error {
  isTooBig?: boolean;
}

interface FormValues {
  name: string;
  description: string;
  type: AccommodationType | '';
  email: string;
  website: string;
  addressStreet: string;
  addressZip: string;
  addressCity: string;
  addressCountry: string;
  priceRange: PriceRange | '';
}

const ACCOMMODATION_TYPES: AccommodationType[] = [
  'hostel',
  'monastery',
  'b_and_b',
  'hotel',
  'apartment',
  'private_room',
  'church',
];

const PRICE_RANGES: PriceRange[] = ['budget', 'moderate', 'comfortable', 'luxury'];

export function AddAccommodationForm({ slug }: AddAccommodationFormProps) {
  const t = useTranslations('accommodation_new');
  const tWaypoint = useTranslations('waypoint_detail');
  const tCountries = useTranslations('countries');
  const { data: countries = [] } = useCountries();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [collectedImageUrls, setCollectedImageUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      type: '',
      email: '',
      website: '',
      addressStreet: '',
      addressZip: '',
      addressCity: '',
      addressCountry: '',
      priceRange: '',
    },
  });

  const createMutation = useCreateAccommodation(slug);
  const uploadMutation = useUploadImages();

  const nameId = 'accommodation-name';
  const descriptionId = 'accommodation-description';
  const typeId = 'accommodation-type';
  const emailId = 'accommodation-email';
  const websiteId = 'accommodation-website';
  const addressStreetId = 'accommodation-address-street';
  const addressZipId = 'accommodation-address-zip';
  const addressCityId = 'accommodation-address-city';
  const addressCountryId = 'accommodation-address-country';
  const priceRangeId = 'accommodation-price-range';
  const imagesId = 'accommodation-images';

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

    const payload = {
      name: values.name.trim(),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(collectedImageUrls.length > 0 ? { imageUrls: collectedImageUrls } : {}),
      type: values.type as AccommodationType,
      ...(values.email.trim() ? { email: values.email.trim() } : {}),
      ...(values.website.trim() ? { website: values.website.trim() } : {}),
      ...(values.addressStreet.trim()
        ? { addressStreet: values.addressStreet.trim() }
        : {}),
      ...(values.addressZip.trim() ? { addressZip: values.addressZip.trim() } : {}),
      ...(values.addressCity.trim() ? { addressCity: values.addressCity.trim() } : {}),
      ...(values.addressCountry.trim()
        ? { addressCountry: values.addressCountry.trim() }
        : {}),
      ...(values.priceRange ? { priceRange: values.priceRange as PriceRange } : {}),
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

      {/* Type */}
      <div>
        <Label htmlFor={typeId}>{t('field_type')}</Label>
        <div className="mt-1">
          <Controller
            name="type"
            control={control}
            rules={{ required: t('error_type_required') }}
            render={({ field }) => (
              <Select
                id={typeId}
                aria-required="true"
                aria-describedby={errors.type ? `${typeId}-error` : undefined}
                aria-invalid={errors.type ? 'true' : undefined}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}>
                <option value="">{t('field_type')}</option>
                {ACCOMMODATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tWaypoint(
                      `accommodation_type.${type}` as Parameters<typeof tWaypoint>[0],
                    )}
                  </option>
                ))}
              </Select>
            )}
          />
        </div>
        {errors.type && (
          <p
            id={`${typeId}-error`}
            role="alert"
            className="mt-1 text-sm text-destructive">
            {errors.type.message}
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

      {/* Price Range */}
      <div>
        <Label htmlFor={priceRangeId}>{t('field_price_range')}</Label>
        <div className="mt-1">
          <Controller
            name="priceRange"
            control={control}
            render={({ field }) => (
              <Select
                id={priceRangeId}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}>
                <option value="">—</option>
                {PRICE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {tWaypoint(`price_range.${range}` as Parameters<typeof tWaypoint>[0])}
                  </option>
                ))}
              </Select>
            )}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <Label htmlFor={emailId}>{t('field_email')}</Label>
        <div className="mt-1">
          <Input id={emailId} type="email" {...register('email')} />
        </div>
      </div>

      {/* Website */}
      <div>
        <Label htmlFor={websiteId}>{t('field_website')}</Label>
        <div className="mt-1">
          <Input id={websiteId} type="url" {...register('website')} />
        </div>
      </div>

      {/* Address */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          {t('field_address_street')} / {t('field_address_city')}
        </legend>
        <div>
          <Label htmlFor={addressStreetId}>{t('field_address_street')}</Label>
          <div className="mt-1">
            <Input id={addressStreetId} type="text" {...register('addressStreet')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={addressZipId}>{t('field_address_zip')}</Label>
            <div className="mt-1">
              <Input id={addressZipId} type="text" {...register('addressZip')} />
            </div>
          </div>
          <div>
            <Label htmlFor={addressCityId}>{t('field_address_city')}</Label>
            <div className="mt-1">
              <Input id={addressCityId} type="text" {...register('addressCity')} />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor={addressCountryId}>{t('field_address_country')}</Label>
          <div className="mt-1">
            <Controller
              name="addressCountry"
              control={control}
              render={({ field }) => (
                <Select
                  id={addressCountryId}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}>
                  <option value="">—</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {tCountries(c.toLowerCase() as Parameters<typeof tCountries>[0])}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>
      </fieldset>

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
            <i className="icon-spinner text-xl animate-spin" aria-hidden="true" />
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
          onClick={() => router.push(`/waypoints/${slug}`)}
          className="w-full sm:w-auto">
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
