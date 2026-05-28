'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import { useCaminoPictures } from '@/app/api/camino-pictures/use-camino-pictures';
import { useUploadCaminoPicture } from '@/app/api/camino-pictures/use-upload-camino-picture';
import { useDeleteCaminoPicture } from '@/app/api/camino-pictures/use-delete-camino-picture';
import { Lightbox } from './Lightbox';
import type { LightboxImage } from './Lightbox';
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

interface CaminoPicturesGalleryProps {
  caminoId: string;
}

function resolveUploadError(
  status: number | undefined,
  t: (key: 'upload_error_too_large' | 'upload_error_wrong_type' | 'upload_error_primary_exists' | 'upload_error_generic') => string,
): string {
  if (status === 413) return t('upload_error_too_large');
  if (status === 415) return t('upload_error_wrong_type');
  if (status === 409) return t('upload_error_primary_exists');
  return t('upload_error_generic');
}

export function CaminoPicturesGallery({ caminoId }: CaminoPicturesGalleryProps) {
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
  const triggerRef = useRef<HTMLElement | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [primaryUploadError, setPrimaryUploadError] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [deleteDialogPictureId, setDeleteDialogPictureId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const primary = data?.primary ?? null;
  const gallery = data?.gallery ?? [];
  const totalCount = (primary ? 1 : 0) + gallery.length;
  const limitReached = totalCount >= 50;

  const galleryImages: LightboxImage[] = gallery.map((p) => ({ id: p.id, url: p.url }));

  const openGalleryLightbox = useCallback(
    (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
      triggerRef.current = e.currentTarget;
      setLightboxIndex(index);
    },
    [],
  );

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, []);

  const handleNavigate = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  function handlePrimaryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryUploadError(null);
    uploadMutation.mutate(
      { file, isPrimary: true },
      {
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
    <>
      {/* Gallery grid — only when gallery has items */}
      {gallery.length > 0 && (
        <section className="mt-8">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {gallery.map((picture, index) => (
              <div
                key={picture.id}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg">
                <button
                  type="button"
                  aria-label={t('open_fullscreen')}
                  onClick={(e) => openGalleryLightbox(index, e)}
                  className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="sr-only">{t('open_fullscreen')}</span>
                </button>
                <Image
                  src={picture.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized
                />
                {canDeletePicture(picture.uploadedBy) && (
                  <button
                    type="button"
                    aria-label={t('delete')}
                    onClick={() => handleDeleteIconClick(picture.id)}
                    className="absolute bottom-2 right-2 z-20 flex size-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upload controls — pilgrims only */}
      {isPilgrim && (
        <div className="mt-6 space-y-2">
          {limitReached ? (
            <p className="text-sm text-muted-foreground">{t('limit_reached')}</p>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Delete error */}
      {deleteError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
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

      {/* Gallery lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          currentIndex={lightboxIndex}
          isGalleryMode={true}
          onClose={closeLightbox}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}
