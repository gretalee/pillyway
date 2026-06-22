import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { redirectIfLegacyCaminoUrl } from '@/lib/redirectIfLegacyCaminoUrl';
import { fetchCamino } from '@/app/api/caminos/caminos';
import { UpdateCaminoForm } from '../components/UpdateCaminoForm';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations('caminos_update');
  let name = '';
  try {
    const camino = await fetchCamino(slug);
    name = camino.name;
  } catch {
    // fall through to empty name
  }
  const description = t('meta_description');
  return {
    title: name ? t('meta_title', { name }) : t('title'),
    description,
    openGraph: {
      title: name ? t('meta_title', { name }) : t('title'),
      description,
    },
  };
}

export default async function UpdateCaminoPage({ params }: Props) {
  const { slug } = await params;
  await redirectIfLegacyCaminoUrl(slug, 'update');
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/api/auth/login');
  }

  const t = await getTranslations('caminos_update');

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t('title')}</h1>
      <UpdateCaminoForm caminoId={slug} />
    </div>
  );
}
