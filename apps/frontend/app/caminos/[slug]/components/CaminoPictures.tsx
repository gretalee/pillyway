'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import { useCaminoPictures } from '@/app/api/camino-pictures/use-camino-pictures';
import { useUploadCaminoPicture } from '@/app/api/camino-pictures/use-upload-camino-picture';
import { useUploadCaminoPictures } from '@/app/api/camino-pictures/use-upload-camino-pictures';
import { useDeleteCaminoPicture } from '@/app/api/camino-pictures/use-delete-camino-picture';
import { useUpdateCaminoPicture } from '@/app/api/camino-pictures/use-update-camino-picture';
import { Lightbox } from '@/app/components/Lightbox';
import { PictureGallery, type GalleryPicture } from '@/app/components/PictureGallery';
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
import { cn } from '@/lib/utils';

interface CaminoPicturesProps {
  caminoId: string;
  /** Required when section="hero" for the image alt text. */
  caminoName?: string;
  /** "hero" renders the main picture slot above the description.
   *  "gallery" renders the gallery grid, upload controls, and delete dialogs. */
  section: 'hero' | 'gallery';
}

function uploadErrorMessage(
  status: number | undefined,
  t: (
    key:
      | 'upload_error_too_large'
      | 'upload_error_wrong_type'
      | 'upload_error_cannot_process'
      | 'upload_error_primary_exists'
      | 'limit_reached'
      | 'upload_error_generic',
  ) => string,
): string {
  if (status === 400) return t('upload_error_cannot_process');
  if (status === 413) return t('upload_error_too_large');
  if (status === 415) return t('upload_error_wrong_type');
  if (status === 409) return t('upload_error_primary_exists');
  if (status === 422) return t('limit_reached');
  return t('upload_error_generic');
}

export function CaminoPictures({ caminoId, caminoName, section }: CaminoPicturesProps) {
  const t = useTranslations('camino_detail.pictures');
  const tCommon = useTranslations('common');

  const { user, accessToken } = useKindeBrowserClient();
  const roleKeys = accessToken?.roles?.map((r) => r.key) ?? [];
  const isPilgrim = roleKeys.includes('pilgrim');
  const isOwner = roleKeys.includes('owner');

  const { data } = useCaminoPictures(caminoId);
  const primaryUploadMutation = useUploadCaminoPicture(caminoId);
  const galleryUploadMutation = useUploadCaminoPictures(caminoId);
  const deleteMutation = useDeleteCaminoPicture(caminoId);
  const updateLabelMutation = useUpdateCaminoPicture(caminoId);

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const heroTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [heroLightboxOpen, setHeroLightboxOpen] = useState(false);
  const [primaryUploadError, setPrimaryUploadError] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [deleteDialogPictureId, setDeleteDialogPictureId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Label editing state
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [labelError, setLabelError] = useState<string | null>(null);

  const primary = data?.primary ?? null;
  const gallery = data?.gallery ?? [];
  const totalCount = (primary ? 1 : 0) + gallery.length;
  const limitReached = totalCount >= 50;

  const galleryImages: GalleryPicture[] = gallery.map((p) => ({
    id: p.id,
    url: p.url,
    label: p.label,
  }));

  function handlePrimaryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryUploadError(null);
    primaryUploadMutation.mutate(
      { file, isPrimary: true },
      {
        onError: (err) => {
          setPrimaryUploadError(
            uploadErrorMessage((err as Error & { status?: number }).status, t),
          );
        },
      },
    );
    e.target.value = '';
  }

  function handleGalleryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setGalleryUploadError(null);
    galleryUploadMutation.mutate(files, {
      onError: (err) => {
        setGalleryUploadError(
          uploadErrorMessage((err as Error & { status?: number }).status, t),
        );
      },
    });
    e.target.value = '';
  }

  function canEditPicture(uploadedBy: string): boolean {
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
      onError: () => setDeleteError(t('delete_error')),
    });
  }

  function startLabelEdit(pictureId: string, currentLabel: string | null) {
    setLabelError(null);
    setLabelDraft(currentLabel ?? '');
    setEditingLabelId(pictureId);
  }

  function cancelLabelEdit() {
    setEditingLabelId(null);
    setLabelDraft('');
    setLabelError(null);
  }

  function commitLabelEdit(pictureId: string) {
    const trimmed = labelDraft.trim();
    const newLabel = trimmed === '' ? null : trimmed;
    setEditingLabelId(null);
    setLabelError(null);
    updateLabelMutation.mutate(
      { pictureId, label: newLabel },
      {
        onError: () => setLabelError(t('label_error')),
      },
    );
  }

  function handleLabelKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    pictureId: string,
  ) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitLabelEdit(pictureId);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelLabelEdit();
    }
  }

  // ── Hero section ─────────────────────────────────────────────────────────────

  if (section === 'hero') {
    const isPrimaryUploading = primaryUploadMutation.isPending;

    // No primary picture: show upload placeholder for pilgrims, nothing for guests
    if (!primary) {
      if (!isPilgrim) return null;

      return (
        <div className="mt-6">
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
            className="flex aspect-video w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
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
      );
    }

    // Primary picture exists: show image with optional delete button
    const canDelete = canEditPicture(primary.uploadedBy);

    return (
      <>
        <div className="mt-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            {/* Fullscreen button covers the whole image */}
            <button
              ref={heroTriggerRef}
              type="button"
              aria-label={t('open_fullscreen')}
              onClick={() => setHeroLightboxOpen(true)}
              className={cn(
                'absolute inset-0 z-10 cursor-zoom-in',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              )}>
              <span className="sr-only">{t('open_fullscreen')}</span>
            </button>

            <Image
              src={primary.url}
              alt={caminoName ?? ''}
              fill
              className="object-cover cursor-zoom-in"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
              unoptimized
            />

            {/* Delete button — always visible for eligible users */}
            {canDelete && (
              <button
                type="button"
                aria-label={t('delete')}
                onClick={() => handleDeleteIconClick(primary.id)}
                className={cn(
                  'absolute right-2 top-2 z-20 flex size-8 items-center justify-center rounded-md',
                  'bg-black/60 text-white transition-colors',
                  'hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                )}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

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

        {deleteError && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {deleteError}
          </p>
        )}

        {heroLightboxOpen && (
          <Lightbox
            images={[{ id: primary.id, url: primary.url }]}
            initialIndex={0}
            currentIndex={0}
            isGalleryMode={false}
            onClose={() => {
              setHeroLightboxOpen(false);
              heroTriggerRef.current?.focus();
            }}
            onNavigate={() => {}}
          />
        )}
      </>
    );
  }

  // ── Gallery section ───────────────────────────────────────────────────────────

  const isGalleryUploading = galleryUploadMutation.isPending;

  return (
    <>
      {/* Gallery grid */}
      {gallery.length > 0 && (
        <section className="mt-8">
          <PictureGallery
            pictures={galleryImages}
            renderThumbnailOverlay={(picture, index) => {
              if (!canEditPicture(gallery[index].uploadedBy)) return null;
              return (
                <div className="absolute bottom-2 right-2 z-20 flex gap-1">
                  <button
                    type="button"
                    aria-label={t('edit_label')}
                    onClick={() => startLabelEdit(picture.id, picture.label ?? null)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    )}>
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('delete')}
                    onClick={() => handleDeleteIconClick(picture.id)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    )}>
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              );
            }}
            renderAfterThumbnail={(picture) => {
              if (editingLabelId === picture.id) {
                return (
                  <input
                    autoFocus
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onBlur={() => commitLabelEdit(picture.id)}
                    onKeyDown={(e) => handleLabelKeyDown(e, picture.id)}
                    maxLength={200}
                    placeholder={t('label_placeholder')}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                );
              }
              if (picture.label) {
                return (
                  <p className="truncate px-0.5 text-xs text-muted-foreground">{picture.label}</p>
                );
              }
              return null;
            }}
          />
          {labelError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {labelError}
            </p>
          )}
        </section>
      )}

      {/* Gallery upload — pilgrims only */}
      {isPilgrim && !limitReached && (
        <div className="mt-6">
          <input
            ref={galleryFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
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
      )}

      {isPilgrim && limitReached && (
        <p className="mt-4 text-sm text-muted-foreground">{t('limit_reached')}</p>
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

    </>
  );
}
