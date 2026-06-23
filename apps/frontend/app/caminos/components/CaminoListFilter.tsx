'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import type { CaminoSummary } from '@/app/api/caminos/caminos';
import { CaminoActionsMenu } from './CaminoActionsMenu';
import { VerifiedBadge } from './VerifiedBadge';
import CaminoMainImage from './CaminoMainImage';
import { cn } from '@/lib/utils';

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
  className?: string;
}

export function CaminoListFilter({
  caminos,
  isPilgrim,
  className,
}: CaminoListFilterProps) {
  const t = useTranslations('caminos');
  const tCodes = useTranslations('country_codes');
  const [onlyVerified, setOnlyVerified] = useState(false);

  const filteredCaminos = onlyVerified ? caminos.filter((c) => c.verified) : caminos;

  return (
    <>
      <div className={cn('flex items-center gap-3', className)}>
        <ToggleSwitch
          id="filter-verified-switch"
          checked={onlyVerified}
          onCheckedChange={setOnlyVerified}
        />
        <label
          htmlFor="filter-verified-switch"
          className="cursor-pointer select-none text-sm text-foreground">
          {t('filter_verified_label')}
        </label>
      </div>

      {onlyVerified && filteredCaminos.length === 0 && (
        <p className="mt-4 text-muted-foreground">{t('filter_no_verified')}</p>
      )}

      {filteredCaminos.length > 0 && (
        <ul className="mt-4 space-y-4" aria-label={t('title')}>
          {filteredCaminos.map((camino) => (
            <li
              key={camino.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="">
                  <Link href={`/caminos/${camino.slug}`}>
                    <h2 className="text-lg font-semibold text-foreground inline">
                      {camino.name}
                    </h2>
                  </Link>
                  {camino.countries.length > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {camino.countries.map((c) => tCodes(c)).join(' · ')}
                    </span>
                  )}
                  {camino.verified && (
                    <VerifiedBadge className="inline-block pl-2 translate-y-0.5" />
                  )}
                </div>
                {isPilgrim && <CaminoActionsMenu camino={camino} />}
              </div>

              <Link href={`/caminos/${camino.slug}`} className="flex-1">
                {camino.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {truncateAtSentence(camino.description)}
                  </p>
                )}
                <CaminoMainImage
                  caminoId={camino.id}
                  title={camino.name}
                  className="mt-1"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
