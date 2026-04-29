'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useLocaleStore } from '@/store/locale-store';
import type { Locale } from '@/i18n/detectLocale';
import { cn } from '@/lib/utils';

const LOCALES: Locale[] = ['de', 'en'];
const LOCALE_LABELS: Record<Locale, string> = { de: 'DE', en: 'EN' };

export function LanguageSwitcher() {
  const t = useTranslations('header');
  const { locale, setLocale } = useLocaleStore();
  const router = useRouter();

  function handleSelect(next: Locale) {
    if (next === locale) {
      return;
    }
    setLocale(next);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label={t('aria_language_switcher')}
      className="flex items-center gap-0.5"
    >
      {LOCALES.map((loc) => {
        const isActive = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleSelect(loc)}
            aria-pressed={isActive}
            className={cn(
              'rounded px-2 py-1 text-sm leading-none transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'font-semibold text-foreground'
                : 'font-normal text-muted-foreground hover:text-foreground',
            )}
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
