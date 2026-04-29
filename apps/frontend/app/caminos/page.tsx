import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function CaminosPage() {
  const t = await getTranslations('caminos');

  return (
    <main className="flex flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('browse')}</p>
      <Link href="/caminos/new" className="mt-4 text-blue-500 underline">
        {t('create_link')}
      </Link>
    </main>
  );
}
