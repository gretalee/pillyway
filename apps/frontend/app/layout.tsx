import { getLocale, getMessages, getTimeZone, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Providers } from '@/providers/providers';
import { Header } from '@/app/components/layout/Header';
import { Footer } from '@/app/components/layout/Footer';
import { PathTracker } from '@/app/components/PathTracker';
import { getAuthUser } from '@/lib/getAuthUser';
import type { Locale } from '@/i18n/detectLocale';
import '../assets/styles/global.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SUPPORTED_LOCALES } from '@/i18n/detectLocale';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pillyway.de';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('meta');

  const ogLocale = locale;
  const ogAlternateLocale = SUPPORTED_LOCALES.filter((l) => l !== locale);

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: 'Pillyway',
    title: {
      default: t('title'),
      template: `%s | Pillyway`,
    },
    description: t('description'),
    openGraph: {
      siteName: 'Pillyway',
      type: 'website',
      locale: ogLocale,
      alternateLocale: ogAlternateLocale,
    },
    twitter: {
      card: 'summary_large_image',
    },
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
          <div className="flex flex-col flex-1">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
