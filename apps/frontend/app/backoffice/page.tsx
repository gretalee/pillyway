import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations('backoffice');

  return (
    <main className="flex flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('heading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      <BackofficeUserDebug />
    </main>
  );
}
