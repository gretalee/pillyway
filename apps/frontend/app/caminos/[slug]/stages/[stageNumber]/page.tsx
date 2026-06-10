import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAuthUser } from '@/lib/getAuthUser';
import { redirectIfLegacyCaminoUrl } from '@/lib/redirectIfLegacyCaminoUrl';
import { StageDetail } from './components/StageDetail';

interface Props {
  params: Promise<{ slug: string; stageNumber: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { stageNumber } = await params;
  const n = parseInt(stageNumber, 10);
  if (isNaN(n) || n < 1) notFound();
  const t = await getTranslations('stage_detail');
  const title = t('meta_title', { number: n });
  const description = t('meta_description', { number: n });
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
