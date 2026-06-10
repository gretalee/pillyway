import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { fetchAccommodation } from '@/app/api/accommodations/fetch-accommodation';
import { AccommodationCard } from '@/app/waypoints/[slug]/components/AccommodationCard';

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('accommodation_detail');
  try {
    const accommodation = await fetchAccommodation(id);
    return {
      title: t('meta_title', { name: accommodation.name }),
      description: t('meta_description'),
      openGraph: {
        title: t('meta_title', { name: accommodation.name }),
        description: t('meta_description'),
      },
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
        showImage={false}
        headerClass="text-2xl mb-4"
      />

      {/* Images */}
      {accommodation.imageUrls.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {accommodation.imageUrls.map((url) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-md">
              <Image
                src={url}
                alt={accommodation.name}
                fill
                className="object-cover"
                loading="eager"
                unoptimized
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
