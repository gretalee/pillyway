'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { buttonVariants } from '@/app/components/ui/button';
import { useUserStore } from '@/store/user-store';
import { useCaminos } from '@/app/api/use-caminos';

export function CaminoList() {
  const t = useTranslations('caminos');
  const isPilgrim = useUserStore((state) => state.hasRole('pilgrim'));

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
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{camino.name}</h2>
                  {camino.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {camino.description}
                    </p>
                  )}
                </div>
                {camino.verified && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {t('verified')}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
