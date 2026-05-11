import { getLocale, getMessages, getTimeZone, getTranslations } from 'next-intl/server';
import { Providers } from '@/providers/providers';
import { Header } from '@/app/components/layout/Header';
import { getAuthUser } from '@/lib/getAuthUser';
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
  const authUser = await getAuthUser();

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
