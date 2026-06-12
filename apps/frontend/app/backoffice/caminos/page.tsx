import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/getAuthUser';
import { BackofficeCaminosClient } from './BackofficeCaminosClient';

export async function generateMetadata() {
  const t = await getTranslations('backoffice_caminos');
  return {
    title: t('heading'),
    description: t('subtitle'),
    robots: { index: false, follow: false },
  };
}

export default async function BackofficeCaminosPage() {
  const user = await getAuthUser();
  const isOwner = user?.roles.some((r) => r.key === 'owner') ?? false;

  if (!isOwner) {
    redirect('/');
  }

  return <BackofficeCaminosClient />;
}
