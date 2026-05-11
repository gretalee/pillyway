'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { LocaleStoreInitializer } from './LocaleStoreInitializer';
import type { Locale } from '@/i18n/detectLocale';

interface ProvidersProps {
  children: React.ReactNode;
  locale: Locale;
  messages: AbstractIntlMessages;
  timeZone: string | undefined;
}

export function Providers({ children, locale, messages, timeZone }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <QueryClientProvider client={queryClient}>
        <LocaleStoreInitializer locale={locale} />
        {children}
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
