'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { buttonVariants } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import type { CaminoSummary } from '@/app/api/caminos/caminos';
import { CaminoActionsMenu } from './CaminoActionsMenu';
import { VerifiedBadge } from './VerifiedBadge';

const DESCRIPTION_MAX = 665;

function truncateAtSentence(text: string): string {
  if (text.length <= DESCRIPTION_MAX) return text;
  const sub = text.slice(0, DESCRIPTION_MAX);
  const lastPeriod = sub.lastIndexOf('.');
  if (lastPeriod > 0) return sub.slice(0, lastPeriod + 1) + '…';
  return sub + '…';
}

interface CaminoListFilterProps {
  caminos: CaminoSummary[];
  isPilgrim: boolean;
}

export function CaminoListFilter({ caminos, isPilgrim }: CaminoListFilterProps) {
  const t = useTranslations('caminos');
  const [onlyVerified, setOnlyVerified] = useState(false);

  const displayed = onlyVerified ? caminos.filter((c) => c.verified) : caminos;

  return (
    <>
      {isPilgrim && (
        <div className="mb-6">
          <Link href="/caminos/new" className={buttonVariants({ variant: 'default' })}>
            {t('create_link')}
          </Link>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <SwitchPrimitive.Root
          id="filter-verified-switch"
          checked={onlyVerified}
          onCheckedChange={setOnlyVerified}
          className={cn(
            'relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full border border-transparent',
            'bg-input transition-colors outline-none',
            'focus-visible:ring-3 focus-visible:ring-ring/50',
            'data-checked:bg-primary',
            'disabled:pointer-events-none disabled:opacity-50',
          )}>
          <SwitchPrimitive.Thumb
            className={cn(
              'block size-4 rounded-full bg-background shadow-sm transition-transform',
              'translate-x-0.5 data-checked:translate-x-[calc(100%-2px)]',
            )}
          />
        </SwitchPrimitive.Root>
        <label
          htmlFor="filter-verified-switch"
          className="cursor-pointer select-none text-sm text-foreground">
          {t('filter_verified_label')}
        </label>
      </div>

      {displayed.length === 0 ? (
        <p className="text-muted-foreground">{t('filter_no_verified')}</p>
      ) : (
        <ul className="space-y-4" aria-label={t('title')}>
          {displayed.map((camino) => (
            <li
              key={camino.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/caminos/${camino.id}`} className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">{camino.name}</h2>
                  {camino.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {truncateAtSentence(camino.description)}
                    </p>
                  )}
                </Link>

                <div className="flex shrink-0 items-center gap-2">
                  {camino.verified && <VerifiedBadge />}
                  {isPilgrim && <CaminoActionsMenu camino={camino} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
