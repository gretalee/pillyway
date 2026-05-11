import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getLocale, getMessages, getTimeZone, getTranslations } from 'next-intl/server';
import { Providers } from '@/providers/providers';
import { Header } from '@/app/components/layout/Header';
import type { AuthUser } from '@/store/user-store';
import type { Locale } from '@/i18n/detectLocale';
import './globals.css';

export async function generateMetadata() {
  const t = await getTranslations('meta');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { getUser, getRoles } = getKindeServerSession();
  // Use getUser() rather than isAuthenticated() here — the latter internally
  // calls redirectOnExpiredToken() which throws a Next.js redirect for users
  // with stale cookies, breaking public pages. getUser() returns null safely.
  const kindeUser = await getUser();

  let authUser: AuthUser | null = null;
  if (kindeUser) {
    const roles = await getRoles();
    authUser = {
      id: kindeUser.id,
      email: kindeUser.email ?? null,
      firstName: kindeUser.given_name ?? null,
      lastName: kindeUser.family_name ?? null,
      picture: kindeUser.picture ?? null,
      roles: roles ?? [],
    };
  }

  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers
          user={authUser}
          locale={locale}
          messages={messages}
          timeZone={timeZone}>
          <Header user={authUser} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
