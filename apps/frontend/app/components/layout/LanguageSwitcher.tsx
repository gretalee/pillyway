'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useLocaleStore } from '@/store/locale-store';
import type { Locale } from '@/i18n/detectLocale';
import { Button } from '../ui/button';

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
      className="flex items-center sm:gap-0.5">
      {LOCALES.map((loc) => {
        const isActive = loc === locale;
        return (
          <Button
            key={loc}
            variant={isActive ? 'default' : 'ghost'}
            size={'sm'}
            onClick={() => handleSelect(loc)}
            aria-pressed={isActive}>
            {LOCALE_LABELS[loc]}
          </Button>
        );
      })}
    </div>
  );
}
