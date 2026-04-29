import { getTranslations } from 'next-intl/server';

export default async function NewCaminoPage() {
  const t = await getTranslations('caminos_new');

  return (
    <main className="flex flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
    </main>
  );
}
