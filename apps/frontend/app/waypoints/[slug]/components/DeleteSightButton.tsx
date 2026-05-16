'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDeleteSight } from '@/app/api/sights/use-delete-sight';
import { DeleteSightDialog } from './DeleteSightDialog';

interface Props {
  id: string;
  caminoPointId: string;
  name: string;
}

export function DeleteSightButton({ id, caminoPointId, name }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('waypoint_detail');
  const mutation = useDeleteSight(id, caminoPointId);

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
        aria-label={t('delete_sight_label')}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      <DeleteSightDialog
        name={name}
        open={open}
        isPending={mutation.isPending}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
      />
    </>
  );
}
