'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDeleteAccommodation } from '@/app/api/accommodations/use-delete-accommodation';
import { DeleteAccommodationDialog } from './DeleteAccommodationDialog';

interface Props {
  id: string;
  caminoPointId: string;
  name: string;
}

export function DeleteAccommodationButton({ id, caminoPointId, name }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('waypoint_detail');
  const mutation = useDeleteAccommodation(id, caminoPointId);

  function handleConfirm() {
    mutation.mutate(undefined, {
      onSuccess: () => {
        setOpen(false);
        router.refresh();
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
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
      />
    </>
  );
}
