'use client';

import { useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import NProgress from 'nprogress';
import Link from 'next/link';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { Button, buttonVariants } from '@/app/components/ui/button';
import type { PaginatedCaminosResponse } from '@/app/api/caminos/caminos';
import { CaminoActionsMenu } from './CaminoActionsMenu';
import { VerifiedBadge } from './VerifiedBadge';
import CaminoMainImage from './CaminoMainImage';
import Countries from './Countries';
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
  result: PaginatedCaminosResponse;
  isPilgrim: boolean;
  currentVerified: boolean;
  currentCountries: string[];
  currentPage: number;
  className?: string;
}

export function CaminoListFilter({
  result,
  isPilgrim,
  currentVerified,
  currentCountries,
  currentPage,
  className,
}: CaminoListFilterProps) {
  const t = useTranslations('caminos');
  const tCodes = useTranslations('country_codes');
  const tCountries = useTranslations('countries');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isPending) NProgress.start();
    else NProgress.done();
  }, [isPending]);

  function buildUrl(verified: boolean, countries: string[], page: number) {
    const params = new URLSearchParams();
    if (verified) params.set('verified', 'true');
    if (countries.length) params.set('countries', countries.join(','));
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return `/caminos${qs ? `?${qs}` : ''}`;
  }

  function toggleVerified() {
    startTransition(() => router.push(buildUrl(!currentVerified, currentCountries, 1)));
  }

  function toggleCountry(country: string) {
    const next = currentCountries.includes(country)
      ? currentCountries.filter((c) => c !== country)
      : [...currentCountries, country];
    startTransition(() => router.push(buildUrl(currentVerified, next, 1)));
  }

  function resetFilters() {
    startTransition(() => router.push('/caminos'));
  }

  function goToPage(page: number) {
    startTransition(() => router.push(buildUrl(currentVerified, currentCountries, page)));
  }

  const hasActiveFilter = currentVerified || currentCountries.length > 0;

  return (
    <>
      {/* Filter bar */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-6 gap-y-2 bg-pillyGreen-400 drop-shadow-xl rounded-xs px-4 py-3',
          className,
        )}>
        <div
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'flex items-center gap-2',
          )}>
          <ToggleSwitch
            id="filter-verified-switch"
            checked={currentVerified}
            onCheckedChange={toggleVerified}
            className="-translate-y-0.5"
          />
          <label
            htmlFor="filter-verified-switch"
            className="cursor-pointer select-none text-sm text-foreground flex items-center gap-2">
            <i className="icon-award1 text-xl" aria-hidden="true" />
            {t('filter_verified_label')}
          </label>
        </div>

        {result.availableCountries.length > 0 && (
          <div
            className="flex flex-wrap items-center bg-white gap-1 border rounded-sm h-9 px-2"
            aria-label={t('filter_country_aria')}>
            {result.availableCountries.map((country) => {
              const selected = currentCountries.includes(country);
              return (
                <Button
                  key={country}
                  variant={selected ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={selected}
                  title={tCountries(country)}
                  onClick={() => toggleCountry(country)}>
                  {tCodes(country)}
                </Button>
              );
            })}
          </div>
        )}

        <Button variant="ghost" size="lg" onClick={resetFilters}>
          {t('filter_reset')}
        </Button>
      </div>

      {/* Empty state */}
      {result.total === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t(hasActiveFilter ? 'filter_empty' : 'empty')}
        </p>
      )}

      {/* Camino grid */}
      {result.data.length > 0 && (
        <ul
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
          aria-label={t('title')}>
          {result.data.map((camino) => (
            <li
              key={camino.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-4 shadow-sm">
              <Link href={`/caminos/${camino.slug}`}>
                <CaminoMainImage caminoId={camino.id} title={camino.name} />
              </Link>

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-x-2">
                  <Link href={`/caminos/${camino.slug}`} className="inline">
                    <h2 className="inline text-lg font-semibold text-foreground">
                      {camino.name}
                    </h2>
                  </Link>
                  <Countries countries={camino.countries} className="inline" />
                  {camino.verified && (
                    <VerifiedBadge className="inline-block translate-y-0.5" />
                  )}
                </div>
                {isPilgrim && <CaminoActionsMenu camino={camino} />}
              </div>

              <Link href={`/caminos/${camino.slug}`}>
                {camino.description && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {truncateAtSentence(camino.description)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label={t('pagination_previous')}>
            ←
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('pagination_page_info', {
              page: currentPage,
              totalPages: result.totalPages,
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= result.totalPages}
            aria-label={t('pagination_next')}>
            →
          </Button>
        </div>
      )}
    </>
  );
}
