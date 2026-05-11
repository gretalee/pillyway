'use client';

import { useEffect } from 'react';
import { useLocaleStore } from '@/store/locale-store';
import type { Locale } from '@/i18n/detectLocale';

export function LocaleStoreInitializer({ locale }: { locale: Locale }) {
  useEffect(() => {
    useLocaleStore.setState({ locale });
  }, [locale]);
  return null;
}
