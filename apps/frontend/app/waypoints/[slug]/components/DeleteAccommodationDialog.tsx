'use client';

import { useTranslations } from 'next-intl';
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
  name: string;
  open: boolean;
  isPending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteAccommodationDialog({
  name,
  open,
  isPending,
  error,
  onOpenChange,
  onConfirm,
}: Props) {
  const t = useTranslations('waypoint_detail');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete_confirmation_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete_confirmation_description', { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('delete_cancel_action')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}>
            {isPending ? (
              <>
                <i
                  className="icon-spinner mr-2 text-xl animate-spin"
                  aria-hidden="true"
                />
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
