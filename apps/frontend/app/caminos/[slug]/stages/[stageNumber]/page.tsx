import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { sharedOpenGraph } from '@/lib/seo';
import { getAuthUser } from '@/lib/getAuthUser';
import { redirectIfLegacyCaminoUrl } from '@/lib/redirectIfLegacyCaminoUrl';
import { StageDetail } from './components/StageDetail';
import { fetchStage } from '@/app/api/stages/fetch-stage';
import { fetchCamino } from '@/app/api/caminos/caminos';

interface Props {
  params: Promise<{ slug: string; stageNumber: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug, stageNumber } = await params;
  const n = parseInt(stageNumber, 10);
  if (isNaN(n) || n < 1) notFound();
  const [t, og, stage, camino] = await Promise.all([
    getTranslations('stage_detail'),
    sharedOpenGraph(),
    fetchStage(slug, n),
    fetchCamino(slug),
  ]);
  return {
    title: t('meta_title', {
      number: n,
      start: stage.startPoint.name,
      end: stage.endPoint.name,
      name: camino.name,
    }),
    description: t('meta_description', {
      number: n,
      start: stage.startPoint.name,
      end: stage.endPoint.name,
    }),
    openGraph: { ...og, url: `/caminos/${slug}/stages/${n}` },
  };
}

export default async function StageDetailPage({ params }: Props) {
  const { slug, stageNumber } = await params;
  const n = parseInt(stageNumber, 10);
  if (isNaN(n) || n < 1) notFound();
  await redirectIfLegacyCaminoUrl(slug, `stages/${stageNumber}`);
  const user = await getAuthUser();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      <StageDetail caminoId={slug} stageNumber={n} user={user} />
    </div>
  );
}
