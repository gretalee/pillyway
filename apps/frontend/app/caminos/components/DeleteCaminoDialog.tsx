'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import { useDeleteCamino } from '@/app/api/caminos/use-delete-camino';

interface DeleteCaminoDialogProps {
  camino: { id: string; name: string } | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteCaminoDialog({
  camino,
  open,
  onClose,
  onSuccess,
}: DeleteCaminoDialogProps) {
  const t = useTranslations('caminos');
  const mutation = useDeleteCamino();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setDeleteError(null);
      onClose();
    }
  }

  function handleConfirm() {
    if (!camino) return;
    setDeleteError(null);

    mutation.mutate(camino.id, {
      onSuccess: () => {
        onClose();
        onSuccess?.();
      },
      onError: () => {
        setDeleteError(t('delete_dialog_error'));
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete_dialog_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete_dialog_body', { name: camino?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteError}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {t('delete_dialog_cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={handleConfirm}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('delete_dialog_deleting')}
              </>
            ) : (
              t('delete_dialog_confirm')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
