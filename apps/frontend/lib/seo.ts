import { getLocale } from 'next-intl/server';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/detectLocale';

export async function sharedOpenGraph() {
  const locale = (await getLocale()) as Locale;
  return {
    siteName: 'Pillyway' as const,
    type: 'website' as const,
    locale,
    alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale),
  };
}
