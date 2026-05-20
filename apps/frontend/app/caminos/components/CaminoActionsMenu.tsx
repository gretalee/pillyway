'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/app/components/ui/dropdown-menu';
import { DeleteCaminoDialog } from './DeleteCaminoDialog';

interface CaminoActionsMenuProps {
  camino: { id: string; name: string };
}

export function CaminoActionsMenu({ camino }: CaminoActionsMenuProps) {
  const t = useTranslations('caminos');
  const router = useRouter();
  const [deletingCamino, setDeletingCamino] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('actions_menu_aria', { name: camino.name })}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <i className="icon-ellipsis-v text-xl" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" ignoreAnchorWidth>
          <DropdownMenuItem
            className="whitespace-nowrap"
            onClick={() => router.push(`/caminos/${camino.id}/update`)}>
            {t('menu_change_data')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="whitespace-nowrap"
            variant="destructive"
            onClick={() => setDeletingCamino({ id: camino.id, name: camino.name })}>
            {t('menu_delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteCaminoDialog
        camino={deletingCamino}
        open={deletingCamino !== null}
        onClose={() => setDeletingCamino(null)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
