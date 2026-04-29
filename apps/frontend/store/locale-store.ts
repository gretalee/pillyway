import { create } from 'zustand';
import type { Locale } from '@/i18n/detectLocale';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  // Default to 'de' — overwritten by LocaleStoreInitializer on mount once
  // the server-resolved locale is available.
  locale: 'de',
  setLocale: (locale) => {
    set({ locale });
    document.cookie = `pillyway-locale=${locale};max-age=31536000;path=/;SameSite=Lax`;
  },
}));
