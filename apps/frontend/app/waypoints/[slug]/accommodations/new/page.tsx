import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { AddAccommodationForm } from './components/AddAccommodationForm';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations('accommodation_new');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
    },
  };
}

export default async function AddAccommodationPage({ params }: Props) {
  const { slug } = await params;
  const user = await getAuthUser();
  const t = await getTranslations('accommodation_new');
  const canContribute = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  if (!canContribute) {
    redirect(`/waypoints/${slug}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t('title')}</h1>
      <AddAccommodationForm slug={slug} />
    </main>
  );
}
