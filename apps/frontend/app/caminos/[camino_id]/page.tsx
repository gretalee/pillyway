import { getTranslations } from 'next-intl/server';
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
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <CaminoDetail caminoId={camino_id} />
    </main>
  );
}
