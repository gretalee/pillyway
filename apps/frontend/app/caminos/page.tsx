import { getTranslations } from 'next-intl/server';
import { fetchCaminos } from '@/app/api/caminos/caminos';
import { getAuthUser } from '@/lib/getAuthUser';
import { CaminoList } from './components/CaminoList';

export async function generateMetadata() {
  const t = await getTranslations('caminos');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
    },
  };
}

export default async function CaminosPage() {
  const t = await getTranslations('caminos');
  const user = await getAuthUser();

  let caminos: Awaited<ReturnType<typeof fetchCaminos>>;
  try {
    caminos = await fetchCaminos();
  } catch {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('browse')}</p>
        <p role="alert" className="mt-8 text-destructive">
          {t('error_loading')}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('browse')}</p>
      <CaminoList caminos={caminos} user={user} />
    </main>
  );
}
