import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getAuthUser } from '@/lib/getAuthUser';
import { BackofficeUserDebug } from './BackofficeUserDebug';

export async function generateMetadata() {
  const t = await getTranslations('backoffice');
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function BackofficePage() {
  const [t, user] = await Promise.all([getTranslations('backoffice'), getAuthUser()]);

  return (
    <main className="flex flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('heading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      <nav className="mt-8 flex flex-col gap-2" aria-label={t('heading')}>
        <Link
          href="/backoffice/caminos"
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t('nav_caminos')}
        </Link>
      </nav>
      <BackofficeUserDebug user={user} />
    </main>
  );
}
