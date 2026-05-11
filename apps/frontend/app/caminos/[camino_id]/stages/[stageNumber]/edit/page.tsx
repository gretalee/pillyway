import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AccessDenied } from '@/app/caminos/components/AccessDenied';
import { StageEditForm } from './components/StageEditForm';

interface Props {
  params: Promise<{ camino_id: string; stageNumber: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { stageNumber } = await params;
  const t = await getTranslations('stage_edit');
  const title = t('meta_title', { number: Number(stageNumber) });
  const description = t('meta_description');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function StageEditPage({ params }: Props) {
  const { camino_id, stageNumber } = await params;
  const { isAuthenticated, getRoles } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/api/auth/login');
  }

  const roles = await getRoles();
  const canEdit = roles?.some((r) => r.key === 'pilgrim' || r.key === 'owner') ?? false;

  const t = await getTranslations('stage_edit');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        {t('title', { number: Number(stageNumber) })}
      </h1>
      {canEdit ? (
        <StageEditForm caminoId={camino_id} stageNumber={Number(stageNumber)} />
      ) : (
        <AccessDenied message={t('access_denied')} />
      )}
    </main>
  );
}
