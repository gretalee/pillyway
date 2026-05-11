'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { AuthProvider } from './AuthContext';
import { LocaleStoreInitializer } from './LocaleStoreInitializer';
import type { AuthUser } from '@/providers/AuthContext';
import type { Locale } from '@/i18n/detectLocale';

interface ProvidersProps {
  children: React.ReactNode;
  user: AuthUser | null;
  locale: Locale;
  messages: AbstractIntlMessages;
  timeZone: string | undefined;
}

export function Providers({
  children,
  user,
  locale,
  messages,
  timeZone,
}: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider user={user}>
          <LocaleStoreInitializer locale={locale} />
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
