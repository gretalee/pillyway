import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { fetchSight } from '@/app/api/sights/fetch-sight';
import { EditSightForm } from './components/EditSightForm';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations('sight_edit');
  return {
    title: t('meta_title'),
    openGraph: { title: t('meta_title') },
  };
}

export default async function EditSightPage({ params }: Props) {
  const { slug, id } = await params;
  const user = await getAuthUser();
  const t = await getTranslations('sight_edit');

  const canContribute = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  if (!user) {
    redirect('/api/auth/login');
  }

  if (!canContribute) {
    redirect(`/waypoints/${slug}`);
  }

  let sight: Awaited<ReturnType<typeof fetchSight>>;
  try {
    sight = await fetchSight(id);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      notFound();
    }
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-destructive">
          {t('error_generic')}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t('title')}</h1>
      <EditSightForm slug={slug} sight={sight} />
    </main>
  );
}
