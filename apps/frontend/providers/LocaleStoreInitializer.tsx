'use client';

import { useEffect } from 'react';
import { useLocaleStore } from '@/store/locale-store';
import type { Locale } from '@/i18n/detectLocale';

/**
 * Synchronises the server-resolved locale into the Zustand store on mount.
 * This is the approved pattern for hydrating client stores from Server
 * Component data (mirrors UserStoreInitializer). The useEffect here is
 * intentional — it is an imperative sync of external server state.
 */
export function LocaleStoreInitializer({ locale }: { locale: Locale }) {
  useEffect(() => {
    useLocaleStore.setState({ locale });
  }, [locale]);
  return null;
}
