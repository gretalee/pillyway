import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AccessDenied } from '../components/AccessDenied';
import { CreateCaminoForm } from '../components/CreateCaminoForm';

export async function generateMetadata() {
  const t = await getTranslations('caminos_new');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
    },
  };
}

export default async function NewCaminoPage() {
  const { isAuthenticated, getRoles } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/api/auth/login');
  }

  const roles = await getRoles();
  const isPilgrim = roles?.some((r) => r.key === 'pilgrim') ?? false;

  const t = await getTranslations('caminos_new');

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t('title')}</h1>
      {isPilgrim ? <CreateCaminoForm /> : <AccessDenied />}
    </div>
  );
}
