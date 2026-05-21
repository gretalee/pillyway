'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useDeleteAccommodation } from '@/app/api/accommodations/use-delete-accommodation';
import { canDelete } from '@/lib/can-delete';
import { DeleteAccommodationDialog } from './DeleteAccommodationDialog';

const ENTITY_DELETE_WINDOW_MS = 1 * 60 * 60 * 1000; // 1 hour

interface Props {
  id: string;
  caminoPointId: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export function DeleteAccommodationButton({
  id,
  caminoPointId,
  name,
  createdBy,
  createdAt,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations('waypoint_detail');
  const mutation = useDeleteAccommodation(id, caminoPointId);

  const { user, accessToken } = useKindeBrowserClient();
  const roleKeys = accessToken?.roles?.map((r) => r.key) ?? [];

  const showDelete =
    user !== null &&
    canDelete({
      userId: user.id,
      roles: roleKeys,
      createdBy,
      createdAt,
      windowMs: ENTITY_DELETE_WINDOW_MS,
    });

  if (!showDelete) {
    return null;
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setDeleteError(null);
    }
    setOpen(isOpen);
  }

  function handleConfirm() {
    setDeleteError(null);
    mutation.mutate(undefined, {
      onSuccess: () => {
        setOpen(false);
        router.refresh();
      },
      onError: (err) => {
        const status = (err as { status?: number }).status;
        setDeleteError(
          status === 403
            ? t('delete_error_forbidden')
            : t('delete_error'),
        );
      },
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={t('delete_accommodation_label')}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <i className="icon-trash text-xl" aria-hidden="true" />
      </button>

      <DeleteAccommodationDialog
        name={name}
        open={open}
        isPending={mutation.isPending}
        error={deleteError}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
      />
    </>
  );
}
