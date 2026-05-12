'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { CaminoPointSearchResult } from '@/app/api/caminos/use-camino-points-search';

interface SuggestionCardProps {
  suggestion: CaminoPointSearchResult;
  onYes: (suggestion: CaminoPointSearchResult) => void;
  onNo: () => void;
}

export function SuggestionCard({ suggestion, onYes, onNo }: SuggestionCardProps) {
  const t = useTranslations('caminos_new');

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-sm font-medium text-foreground">{t('suggestion.prompt')}</p>
      <p className="mb-1 text-sm font-semibold text-foreground">{suggestion.name}</p>
      {suggestion.description && (
        <p className="mb-3 text-xs text-muted-foreground">{suggestion.description}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onYes(suggestion)}
          aria-label={`${t('suggestion.yes')}: ${suggestion.name}`}
          className={cn(
            'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground',
            'transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}>
          {t('suggestion.yes')}
        </button>
        <button
          type="button"
          onClick={onNo}
          aria-label={t('suggestion.no')}
          className={cn(
            'rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground',
            'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}>
          {t('suggestion.no')}
        </button>
      </div>
    </div>
  );
}
