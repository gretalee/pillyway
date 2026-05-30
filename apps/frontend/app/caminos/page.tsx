import { getTranslations } from 'next-intl/server';
import { fetchCaminos } from '@/app/api/caminos/caminos';
import { getAuthUser } from '@/lib/getAuthUser';
import { CaminoList } from './components/CaminoList';
import Link from 'next/link';

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
  let error: Error | undefined;
  try {
    caminos = await fetchCaminos();
  } catch (e) {
    caminos = [];
    error = e instanceof Error ? e : new Error('Unknown error');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('browse')}</p>
      <p className="mt-2 text-muted-foreground">
        {t.rich('loginInInfo', {
          link: (chunks) => (
            <Link href="/api/auth/login" className="text-blue-600 inline hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t('error_loading')}
        </p>
      )}

      {caminos.length === 0 && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <CaminoList caminos={caminos} user={user} />
      )}
    </div>
  );
}
