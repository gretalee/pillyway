import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchCamino } from '@/app/api/caminos';
import { getAuthUser } from '@/lib/getAuthUser';
import { CaminoDetail } from './components/CaminoDetail';

interface Props {
  params: Promise<{ camino_id: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations('camino_detail');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
    },
  };
}

export default async function CaminoDetailPage({ params }: Props) {
  const { camino_id } = await params;
  const t = await getTranslations('camino_detail');
  const user = await getAuthUser();

  let camino: Awaited<ReturnType<typeof fetchCamino>>;
  try {
    camino = await fetchCamino(camino_id);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      notFound();
    }
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-destructive">
          {t('error_loading')}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <CaminoDetail camino={camino} caminoId={camino_id} user={user} />
    </main>
  );
}
