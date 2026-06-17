'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import { Modal } from '@/app/components/ui/modal';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
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
import { useModalStore } from '@/store/modal-store';
import { useCaminoGpxFiles } from '@/app/api/camino-gpx-files/use-camino-gpx-files';
import { useUploadCaminoGpxFile } from '@/app/api/camino-gpx-files/use-upload-camino-gpx-file';
import { useDeleteCaminoGpxFile } from '@/app/api/camino-gpx-files/use-delete-camino-gpx-file';
import { canDeleteGpxFile } from '@/lib/can-delete-gpx-file';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const LIST_MODAL_ID = 'gpx-file-list';
const UPLOAD_MODAL_ID = 'gpx-file-upload';

interface CaminoGpxFilesProps {
  caminoId: string;
  className?: string;
}

function uploadErrorMessage(
  status: number | undefined,
  t: ReturnType<typeof useTranslations<'camino_detail.gpx'>>,
): string {
  if (status === 409) return t('limit_reached');
  if (status === 413) return t('upload_error_too_large');
  if (status === 415) return t('upload_error_wrong_type');
  if (status === 422) return t('upload_error_invalid');
  return t('upload_error_generic');
}

export function CaminoGpxFiles({ caminoId, className }: CaminoGpxFilesProps) {
  const t = useTranslations('camino_detail.gpx');
  const tCommon = useTranslations('common');
  const openModal = useModalStore((s) => s.open);
  const closeModal = useModalStore((s) => s.close);

  const { user, accessToken } = useKindeBrowserClient();
  const roleKeys = accessToken?.roles?.map((r) => r.key) ?? [];
  const isPilgrim = roleKeys.includes('pilgrim');

  const { data: gpxFiles = [] } = useCaminoGpxFiles(caminoId);
  const uploadMutation = useUploadCaminoGpxFile(caminoId);
  const deleteMutation = useDeleteCaminoGpxFile(caminoId);

  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploaderName =
    [user?.given_name, user?.family_name].filter(Boolean).join(' ') || 'Pilgrim';

  function handleUploadSubmit() {
    if (!selectedFile || !fileName) return;

    setUploadError(null);
    uploadMutation.mutate(
      { file: selectedFile, fileName, uploaderName },
      {
        onSuccess: () => {
          closeModal(UPLOAD_MODAL_ID);
          setFileName('');
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (err) => {
          setUploadError(
            uploadErrorMessage((err as Error & { status?: number }).status, t),
          );
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setDeleteError(null);
    deleteMutation.mutate(deleteTargetId, {
      onError: () => {
        setDeleteError(t('delete_error'));
      },
      onSettled: () => {
        setDeleteTargetId(null);
      },
    });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => openModal(LIST_MODAL_ID)}
        className={cn(
          'border-1 border-pillyGreen-500 bg-pillyGreen-500 text-white px-8 py-8 text-2xl font-bold',
          'outline-dashed outline-2 outline-offset-4 outline-transparent',
          'hover:bg-pillyGreen-500 hover:text-white hover:outline-pillyGreen-500',
          className,
        )}>
        {t('download_button')}
      </Button>

      {/* Download / file list modal */}
      <Modal id={LIST_MODAL_ID} title={t('download_modal_title')}>
        {gpxFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty_state')}</p>
        ) : (
          <ul className="space-y-3">
            {gpxFiles.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={`${API_URL}/caminos/${caminoId}/gpx-files/${file.id}/download`}
                    className="text-sm font-medium underline hover:no-underline truncate block">
                    {file.fileName}
                  </a>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {/* user-controlled — must render as text only */}
                    {file.uploaderName}
                    {' · '}
                    {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {canDeleteGpxFile(user?.id, roleKeys, file.uploadedBy) && (
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={t('delete_confirm_title')}
                    onClick={() => setDeleteTargetId(file.id)}>
                    <i
                      className="icon-trash text-muted-foreground hover:text-foreground"
                      aria-hidden="true"
                    />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isPilgrim && (
          <Button
            variant="outline"
            onClick={() => openModal(UPLOAD_MODAL_ID)}
            className="mt-4">
            {t('upload_button')}
          </Button>
        )}

        {deleteError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {deleteError}
          </p>
        )}
      </Modal>

      {/* Upload modal */}
      <Modal id={UPLOAD_MODAL_ID} title={t('upload_modal_title')}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gpx-file-name">{t('file_name_label')}</Label>
            <Input
              id="gpx-file-name"
              value={fileName}
              placeholder={t('file_name_placeholder')}
              maxLength={100}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gpx-file-input">{t('file_input_label')}</Label>
            <input
              id="gpx-file-input"
              ref={fileInputRef}
              type="file"
              accept=".gpx"
              className={cn(
                'block w-full text-sm text-muted-foreground cursor-pointer',
                'file:mr-4 file:rounded-sm file:text-primary-foreground file:border file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium',
                'hover:file:bg-primary/80',
              )}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {uploadError && (
            <p role="alert" className="text-sm text-destructive">
              {uploadError}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleUploadSubmit}
              disabled={!fileName || !selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? t('uploading') : t('upload_submit')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete_confirm_body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>
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
