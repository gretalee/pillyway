import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { resolveLocale } from './detectLocale';

export type { Locale } from './detectLocale';

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const cookieStore = await cookies();

  // Priority: middleware header → cookie → Accept-Language → default (de).
  // The middleware sets x-pillyway-locale, but Kinde's withAuth short-circuits
  // for publicPaths before the wrapped function runs, so unauthenticated
  // requests to public pages must fall back here directly.
  const fromHeader = headerStore.get('x-pillyway-locale') ?? undefined;
  const fromCookie = cookieStore.get('pillyway-locale')?.value ?? undefined;
  const fromAcceptLanguage = headerStore.get('accept-language') ?? undefined;

  const locale = resolveLocale(fromHeader ?? fromCookie ?? fromAcceptLanguage);

  const messages =
    locale === 'en'
      ? (await import('./messages/en.json')).default
      : (await import('./messages/de.json')).default;

  return { locale, messages, timeZone: 'Europe/Berlin' };
});
