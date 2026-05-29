'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import { useCaminoPictures } from '@/app/api/camino-pictures/use-camino-pictures';
import { useUploadCaminoPicture } from '@/app/api/camino-pictures/use-upload-camino-picture';
import { useDeleteCaminoPicture } from '@/app/api/camino-pictures/use-delete-camino-picture';
import type { UploadCaminoPictureResult } from '@/app/api/camino-pictures/camino-picture-types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/app/components/ui/alert-dialog';

interface CaminoPictureUploadSectionProps {
  /** The camino id — must already be persisted before this component is interactive */
  caminoId: string;
  /** Called when a picture is successfully uploaded (for creation-form cancel cleanup) */
  onUploadSuccess?: (result: UploadCaminoPictureResult) => void;
}

function resolveUploadError(
  status: number | undefined,
  t: (key: 'upload_error_too_large' | 'upload_error_wrong_type' | 'upload_error_primary_exists' | 'limit_reached' | 'upload_error_generic') => string,
): string {
  if (status === 413) return t('upload_error_too_large');
  if (status === 415) return t('upload_error_wrong_type');
  if (status === 409) return t('upload_error_primary_exists');
  if (status === 422) return t('limit_reached');
  return t('upload_error_generic');
}

export function CaminoPictureUploadSection({
  caminoId,
  onUploadSuccess,
}: CaminoPictureUploadSectionProps) {
  const t = useTranslations('camino_detail.pictures');
  const tCommon = useTranslations('common');

  const { user, accessToken } = useKindeBrowserClient();
  const roleKeys = accessToken?.roles?.map((r) => r.key) ?? [];
  const isPilgrim = roleKeys.includes('pilgrim');
  const isOwner = roleKeys.includes('owner');

  const { data } = useCaminoPictures(caminoId);
  const uploadMutation = useUploadCaminoPicture(caminoId);
  const deleteMutation = useDeleteCaminoPicture(caminoId);

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const [primaryUploadError, setPrimaryUploadError] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [deleteDialogPictureId, setDeleteDialogPictureId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const primary = data?.primary ?? null;
  const gallery = data?.gallery ?? [];
  const totalCount = (primary ? 1 : 0) + gallery.length;
  const limitReached = totalCount >= 50;

  function handlePrimaryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryUploadError(null);
    uploadMutation.mutate(
      { file, isPrimary: true },
      {
        onSuccess: (result) => onUploadSuccess?.(result),
        onError: (err) => {
          setPrimaryUploadError(
            resolveUploadError((err as Error & { status?: number }).status, t),
          );
        },
      },
    );
    e.target.value = '';
  }

  function handleGalleryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryUploadError(null);
    uploadMutation.mutate(
      { file, isPrimary: false },
      {
        onSuccess: (result) => onUploadSuccess?.(result),
        onError: (err) => {
          setGalleryUploadError(
            resolveUploadError((err as Error & { status?: number }).status, t),
          );
        },
      },
    );
    e.target.value = '';
  }

  function canDeletePicture(uploadedBy: string): boolean {
    if (!isPilgrim) return false;
    if (isOwner) return true;
    return user?.id === uploadedBy;
  }

  function handleDeleteIconClick(pictureId: string) {
    setDeleteError(null);
    setDeleteDialogPictureId(pictureId);
  }

  function handleDeleteConfirm() {
    if (!deleteDialogPictureId) return;
    const id = deleteDialogPictureId;
    setDeleteDialogPictureId(null);
    deleteMutation.mutate(id, {
      onError: () => {
        setDeleteError(t('delete_error'));
      },
    });
  }

  const isPrimaryUploading =
    uploadMutation.isPending && uploadMutation.variables?.isPrimary === true;
  const isGalleryUploading =
    uploadMutation.isPending && uploadMutation.variables?.isPrimary === false;

  return (
    <div className="space-y-4">
      {/* Primary picture preview */}
      {primary && (
        <div className="group relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={primary.url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {canDeletePicture(primary.uploadedBy) && (
            <button
              type="button"
              aria-label={t('delete')}
              onClick={() => handleDeleteIconClick(primary.id)}
              className="absolute bottom-2 right-2 z-10 flex size-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Gallery thumbnails */}
      {gallery.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {gallery.map((picture) => (
            <div
              key={picture.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-md">
              <Image
                src={picture.url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 25vw"
              />
              {canDeletePicture(picture.uploadedBy) && (
                <button
                  type="button"
                  aria-label={t('delete')}
                  onClick={() => handleDeleteIconClick(picture.id)}
                  className="absolute bottom-1 right-1 z-10 flex size-6 items-center justify-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload controls — pilgrims only */}
      {isPilgrim && limitReached ? (
        <p className="text-sm text-muted-foreground">{t('limit_reached')}</p>
      ) : isPilgrim ? (
        <div className="space-y-2">
          {/* Upload main picture — only when no primary exists */}
          {!primary && (
            <div>
              <input
                ref={primaryFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-hidden="true"
                onChange={handlePrimaryFileChange}
              />
              <button
                type="button"
                disabled={isPrimaryUploading}
                aria-disabled={isPrimaryUploading}
                onClick={() => primaryFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                {isPrimaryUploading ? (
                  <>
                    <i className="icon-spinner animate-spin text-base" aria-hidden="true" />
                    {t('uploading')}
                  </>
                ) : (
                  t('upload_main')
                )}
              </button>
              {primaryUploadError && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {primaryUploadError}
                </p>
              )}
            </div>
          )}

          {/* Upload gallery picture */}
          <div>
            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-hidden="true"
              onChange={handleGalleryFileChange}
            />
            <button
              type="button"
              disabled={isGalleryUploading}
              aria-disabled={isGalleryUploading}
              onClick={() => galleryFileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              {isGalleryUploading ? (
                <>
                  <i className="icon-spinner animate-spin text-base" aria-hidden="true" />
                  {t('uploading')}
                </>
              ) : (
                t('upload_gallery')
              )}
            </button>
            {galleryUploadError && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {galleryUploadError}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Delete error */}
      {deleteError && (
        <p role="alert" className="text-xs text-destructive">
          {deleteError}
        </p>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialogPictureId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteDialogPictureId(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete_confirm.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogPictureId(null)}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
