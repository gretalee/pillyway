import { getLocale, getMessages, getTimeZone, getTranslations } from 'next-intl/server';
import { Providers } from '@/providers/providers';
import { Header } from '@/app/components/layout/Header';
import { PathTracker } from '@/app/components/PathTracker';
import { getAuthUser } from '@/lib/getAuthUser';
import type { Locale } from '@/i18n/detectLocale';
// import './globals.css';
import '../assets/styles/global.css';

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
        <Providers locale={locale} messages={messages} timeZone={timeZone}>
          <PathTracker />
          <Header user={authUser} />
          {children}
          <div className="w-full bg-black">
            <div className="mx-auto flex justify-end max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-2 text-white antialiased">
              <ul className="flex gap-4 ">
                <li>Impressum</li>
                <li>Datenschutzerklärung</li>
              </ul>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
