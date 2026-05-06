'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { buttonVariants } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/app/components/ui/dropdown-menu';
import { useUserStore } from '@/store/user-store';
import { useCaminos, CaminoSummary } from '@/app/api/use-caminos';
import { DeleteCaminoDialog } from './DeleteCaminoDialog';

export function CaminoList() {
  const t = useTranslations('caminos');
  const router = useRouter();
  const isPilgrim = useUserStore((state) => state.hasRole('pilgrim'));
  const userId = useUserStore((state) => state.user?.id);

  const [deletingCamino, setDeletingCamino] = useState<{ id: string; name: string } | null>(null);

  const {
    data: caminos,
    isLoading,
    isError,
  } = useCaminos();

  if (isLoading) {
    return (
      <div className="mt-8 space-y-3" aria-live="polite" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="mt-8 text-destructive">
        {t('error_loading')}
      </p>
    );
  }

  const list = caminos ?? [];

  function canEdit(camino: CaminoSummary): boolean {
    return isPilgrim || userId === camino.createdBy;
  }

  return (
    <section className="mt-8">
      {isPilgrim && (
        <div className="mb-6">
          <Link href="/caminos/new" className={buttonVariants({ variant: 'default' })}>
            {t('create_link')}
          </Link>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-4" aria-label={t('title')}>
          {list.map((camino) => (
            <li
              key={camino.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => router.push(`/caminos/${camino.id}`)}>
                  <h2 className="text-lg font-semibold text-foreground">{camino.name}</h2>
                  {camino.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {camino.description}
                    </p>
                  )}
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  {camino.verified && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t('verified')}
                    </span>
                  )}

                  {canEdit(camino) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t('actions_menu_aria', { name: camino.name })}
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/caminos/${camino.id}/update`)}>
                          {t('menu_change_data')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingCamino({ id: camino.id, name: camino.name })}>
                          {t('menu_delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DeleteCaminoDialog
        camino={deletingCamino}
        open={deletingCamino !== null}
        onClose={() => setDeletingCamino(null)}
      />
    </section>
  );
}
