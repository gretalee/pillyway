"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { UserStoreInitializer } from "./UserStoreInitializer";
import { LocaleStoreInitializer } from "./LocaleStoreInitializer";
import type { AuthUser } from "@/store/user-store";
import type { Locale } from "@/i18n/detectLocale";

interface ProvidersProps {
  children: React.ReactNode;
  user: AuthUser | null;
  locale: Locale;
  messages: AbstractIntlMessages;
}

export function Providers({ children, user, locale, messages }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>
        <UserStoreInitializer user={user} />
        <LocaleStoreInitializer locale={locale} />
        {children}
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
