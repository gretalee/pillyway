'use client';

import { useRef, useState } from 'react';
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

export function AddSightForm({ slug }: AddSightFormProps) {
  const t = useTranslations('sight_new');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [collectedImageUrls, setCollectedImageUrls] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const createMutation = useCreateSight(slug);
  const uploadMutation = useUploadImages();

  const nameId = 'sight-name';
  const descriptionId = 'sight-description';
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNameError(null);
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('error_name_required'));
      return;
    }

    const payload = {
      name: trimmedName,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(collectedImageUrls.length > 0 ? { imageUrls: collectedImageUrls } : {}),
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-required="true"
            aria-describedby={nameError ? `${nameId}-error` : undefined}
          />
        </div>
        {nameError && (
          <p id={`${nameId}-error`} role="alert" className="mt-1 text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor={descriptionId}>{t('field_description')}</Label>
        <div className="mt-1">
          <Textarea
            id={descriptionId}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
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
