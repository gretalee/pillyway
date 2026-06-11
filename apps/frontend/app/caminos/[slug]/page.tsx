import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchCamino } from '@/app/api/caminos/caminos';
import { getAuthUser } from '@/lib/getAuthUser';
import { redirectIfLegacyCaminoUrl } from '@/lib/redirectIfLegacyCaminoUrl';
import { CaminoDetail } from './components/CaminoDetail';
import { StageList } from './components/StageList';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations('camino_detail');

  let name: string;
  try {
    const camino = await fetchCamino(slug);
    name = camino.name;
  } catch {
    name = '';
  }

  return {
    title: t('meta_title', { name }),
    description: t('meta_description', { name }),
    openGraph: {
      title: t('meta_title', { name }),
      description: t('meta_description', { name }),
    },
  };
}

export default async function CaminoDetailPage({ params }: Props) {
  const { slug } = await params;
  await redirectIfLegacyCaminoUrl(slug);

  const t = await getTranslations('camino_detail');
  const user = await getAuthUser();

  let camino: Awaited<ReturnType<typeof fetchCamino>>;
  try {
    camino = await fetchCamino(slug);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      notFound();
    }
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-destructive">
          {t('error_loading')}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      <CaminoDetail camino={camino} user={user}>
        <StageList caminoId={camino.id} />
      </CaminoDetail>
    </div>
  );
}
