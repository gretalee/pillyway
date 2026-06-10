import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { AccessDenied } from '@/app/caminos/components/AccessDenied';
import { redirectIfLegacyCaminoUrl } from '@/lib/redirectIfLegacyCaminoUrl';
import { StageEditForm } from './components/StageEditForm';

interface Props {
  params: Promise<{ slug: string; stageNumber: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { stageNumber } = await params;
  const n = parseInt(stageNumber, 10);
  if (isNaN(n) || n < 1) notFound();
  const t = await getTranslations('stage_edit');
  const title = t('meta_title', { number: n });
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
  const { slug, stageNumber } = await params;
  const n = parseInt(stageNumber, 10);
  if (isNaN(n) || n < 1) notFound();
  await redirectIfLegacyCaminoUrl(slug, `stages/${stageNumber}/edit`);

  const { isAuthenticated, getRoles } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/api/auth/login');
  }

  const roles = await getRoles();
  const canEdit = roles?.some((r) => r.key === 'pilgrim') ?? false;

  const t = await getTranslations('stage_edit');

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        {t('title', { number: n })}
      </h1>
      {canEdit ? (
        <StageEditForm caminoId={slug} stageNumber={n} />
      ) : (
        <AccessDenied message={t('access_denied')} />
      )}
    </div>
  );
}
