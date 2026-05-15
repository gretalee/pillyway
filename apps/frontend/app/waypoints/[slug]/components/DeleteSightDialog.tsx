'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDeleteSight } from '@/app/api/sights/use-delete-sight';
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

interface Props {
  id: string;
  caminoPointId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSightDialog({ id, caminoPointId, name, open, onOpenChange }: Props) {
  const t = useTranslations('waypoint_detail');
  const mutation = useDeleteSight(id, caminoPointId);

  function handleConfirm() {
    mutation.mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete_confirmation_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete_confirmation_description', { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {t('delete_cancel_action')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={handleConfirm}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('delete_confirm_action')}
              </>
            ) : (
              t('delete_confirm_action')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
