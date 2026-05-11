import { getTranslations } from 'next-intl/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { StageDetail } from './components/StageDetail';

interface Props {
  params: Promise<{ camino_id: string; stageNumber: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { stageNumber } = await params;
  const t = await getTranslations('stage_detail');
  const title = t('meta_title', { number: Number(stageNumber) });
  const description = t('meta_description', { number: Number(stageNumber) });
  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function StageDetailPage({ params }: Props) {
  const { camino_id, stageNumber } = await params;
  const user = await getAuthUser();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <StageDetail
        caminoId={camino_id}
        stageNumber={Number(stageNumber)}
        user={user}
      />
    </main>
  );
}
