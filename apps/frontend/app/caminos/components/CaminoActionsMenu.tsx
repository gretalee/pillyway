'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/app/components/ui/dropdown-menu';
import { DeleteCaminoDialog } from './DeleteCaminoDialog';
import { buttonVariants } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { canDelete } from '@/lib/can-delete';

const CAMINO_DELETE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CaminoActionsMenuProps {
  camino: { id: string; name: string; createdBy: string; createdAt: string };
}

export function CaminoActionsMenu({ camino }: CaminoActionsMenuProps) {
  const t = useTranslations('caminos');
  const router = useRouter();
  const [deletingCamino, setDeletingCamino] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { user, accessToken } = useKindeBrowserClient();
  const roleKeys = accessToken?.roles?.map((r) => r.key) ?? [];

  const showDelete =
    user !== null &&
    canDelete({
      userId: user.id,
      roles: roleKeys,
      createdBy: camino.createdBy,
      createdAt: camino.createdAt,
      windowMs: CAMINO_DELETE_WINDOW_MS,
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('actions_menu_aria', { name: camino.name })}
          className={cn(buttonVariants({ variant: 'ghost' }))}>
          <i
            className="icon-ellipsis-v text-xl text-muted-foreground hover:text-foreground"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" ignoreAnchorWidth>
          <DropdownMenuItem
            className="whitespace-nowrap"
            onClick={() => router.push(`/caminos/${camino.id}/update`)}>
            {t('menu_change_data')}
          </DropdownMenuItem>
          {showDelete && (
            <DropdownMenuItem
              className="whitespace-nowrap"
              variant="destructive"
              onClick={() => setDeletingCamino({ id: camino.id, name: camino.name })}>
              {t('menu_delete')}
            </DropdownMenuItem>
          )}
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
