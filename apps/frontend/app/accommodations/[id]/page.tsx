import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { fetchAccommodation } from '@/app/api/accommodations/fetch-accommodation';
import { sharedOpenGraph } from '@/lib/seo';
import { AccommodationCard } from '@/app/waypoints/[slug]/components/AccommodationCard';
import { PictureGallery } from '@/app/components/PictureGallery';

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [t, og] = await Promise.all([getTranslations('accommodation_detail'), sharedOpenGraph()]);
  try {
    const accommodation = await fetchAccommodation(id);
    return {
      title: t('meta_title', { name: accommodation.name }),
      description: t('meta_description'),
      openGraph: { ...og, url: `/accommodations/${id}` },
    };
  } catch {
    return { title: t('meta_title', { name: '' }) };
  }
}

export default async function AccommodationDetailPage({ params }: Props) {
  const { id } = await params;
  const [user, t] = await Promise.all([
    getAuthUser(),
    getTranslations('accommodation_detail'),
  ]);

  const isOwner = user?.roles.some((r) => r.key === 'owner') ?? false;

  const canContribute = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  let accommodation: Awaited<ReturnType<typeof fetchAccommodation>>;
  try {
    accommodation = await fetchAccommodation(id);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      notFound();
    }
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-destructive">
          {t('error_loading')}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href={`/waypoints/${accommodation.waypointSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <i className="icon-chevron-left text-xl" aria-hidden="true" />
          {t('back_label')}
        </Link>
      </div>

      <AccommodationCard
        key={accommodation.id}
        accommodation={accommodation}
        headlineLevel={1}
        slug={accommodation.waypointSlug}
        canContribute={canContribute}
        isOwner={isOwner}
        showImages={false}
        headerClass="text-2xl mb-4"
      />

      {/* Images */}
      {accommodation.imageUrls.length > 0 && (
        <PictureGallery
          pictures={accommodation.imageUrls.map((url) => ({ id: url, url }))}
          className="mt-8 sm:grid-cols-3 lg:grid-cols-3"
        />
      )}
    </div>
  );
}
