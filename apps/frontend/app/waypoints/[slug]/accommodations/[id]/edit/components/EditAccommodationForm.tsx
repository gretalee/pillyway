'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { useUpdateAccommodation } from '@/app/api/accommodations/use-update-accommodation';
import type {
  AccommodationDetail,
  AccommodationType,
  PriceRange,
} from '@/app/api/accommodations/accommodation-types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';

interface EditAccommodationFormProps {
  slug: string;
  accommodation: AccommodationDetail;
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
];

const PRICE_RANGES: PriceRange[] = ['budget', 'moderate', 'comfortable', 'luxury'];

export function EditAccommodationForm({ slug, accommodation }: EditAccommodationFormProps) {
  const tEdit = useTranslations('accommodation_edit');
  const tNew = useTranslations('accommodation_new');
  const tWaypoint = useTranslations('waypoint_detail');
  const router = useRouter();

  const [removeImageUrls, setRemoveImageUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: accommodation.name,
      description: accommodation.description ?? '',
      type: accommodation.type,
      email: accommodation.email ?? '',
      website: accommodation.website ?? '',
      addressStreet: accommodation.addressStreet ?? '',
      addressZip: accommodation.addressZip ?? '',
      addressCity: accommodation.addressCity ?? '',
      addressCountry: accommodation.addressCountry ?? '',
      priceRange: accommodation.priceRange ?? '',
    },
  });

  const updateMutation = useUpdateAccommodation(accommodation.id, accommodation.caminoPointId);

  const nameId = 'edit-accommodation-name';
  const descriptionId = 'edit-accommodation-description';
  const typeId = 'edit-accommodation-type';
  const emailId = 'edit-accommodation-email';
  const websiteId = 'edit-accommodation-website';
  const addressStreetId = 'edit-accommodation-address-street';
  const addressZipId = 'edit-accommodation-address-zip';
  const addressCityId = 'edit-accommodation-address-city';
  const addressCountryId = 'edit-accommodation-address-country';
  const priceRangeId = 'edit-accommodation-price-range';

  const visibleExistingImages = accommodation.imageUrls.filter(
    (url) => !removeImageUrls.includes(url),
  );

  function handleRemoveExistingImage(url: string) {
    setRemoveImageUrls((prev) => [...prev, url]);
  }

  const onSubmit = (values: FormValues) => {
    setFormError(null);

    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      type: values.type as AccommodationType,
      email: values.email.trim() || null,
      website: values.website.trim() || null,
      addressStreet: values.addressStreet.trim() || null,
      addressZip: values.addressZip.trim() || null,
      addressCity: values.addressCity.trim() || null,
      addressCountry: values.addressCountry.trim() || null,
      priceRange: (values.priceRange as PriceRange) || null,
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

      {/* Type */}
      <div>
        <Label htmlFor={typeId}>{tNew('field_type')}</Label>
        <div className="mt-1">
          <Controller
            name="type"
            control={control}
            rules={{ required: tNew('error_type_required') }}
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
                <option value="">—</option>
                {ACCOMMODATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tWaypoint(`accommodation_type.${type}` as Parameters<typeof tWaypoint>[0])}
                  </option>
                ))}
              </Select>
            )}
          />
        </div>
        {errors.type && (
          <p id={`${typeId}-error`} role="alert" className="mt-1 text-sm text-destructive">
            {errors.type.message}
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

      {/* Price Range */}
      <div>
        <Label htmlFor={priceRangeId}>{tNew('field_price_range')}</Label>
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
        <Label htmlFor={emailId}>{tNew('field_email')}</Label>
        <div className="mt-1">
          <Input id={emailId} type="email" {...register('email')} />
        </div>
      </div>

      {/* Website */}
      <div>
        <Label htmlFor={websiteId}>{tNew('field_website')}</Label>
        <div className="mt-1">
          <Input id={websiteId} type="url" {...register('website')} />
        </div>
      </div>

      {/* Address */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          {tNew('field_address_street')}
        </legend>
        <div>
          <Label htmlFor={addressStreetId}>{tNew('field_address_street')}</Label>
          <div className="mt-1">
            <Input id={addressStreetId} type="text" {...register('addressStreet')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={addressZipId}>{tNew('field_address_zip')}</Label>
            <div className="mt-1">
              <Input id={addressZipId} type="text" {...register('addressZip')} />
            </div>
          </div>
          <div>
            <Label htmlFor={addressCityId}>{tNew('field_address_city')}</Label>
            <div className="mt-1">
              <Input id={addressCityId} type="text" {...register('addressCity')} />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor={addressCountryId}>{tNew('field_address_country')}</Label>
          <div className="mt-1">
            <Input id={addressCountryId} type="text" {...register('addressCountry')} />
          </div>
        </div>
      </fieldset>

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
