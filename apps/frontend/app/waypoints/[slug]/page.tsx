import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchWaypoint } from '@/app/api/waypoints/fetch-waypoint';
import { getAuthUser } from '@/lib/getAuthUser';
import { WaypointDetailView } from './components/WaypointDetailView';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const waypoint = await fetchWaypoint(slug);
    const t = await getTranslations('waypoint_detail');
    const title = t('meta_title', { name: waypoint.name });
    const description = t('meta_description', { name: waypoint.name, country: waypoint.country });
    return { title, description, openGraph: { title, description } };
  } catch {
    return {};
  }
}

export default async function WaypointDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations('waypoint_detail');
  const user = await getAuthUser();

  let waypoint: Awaited<ReturnType<typeof fetchWaypoint>>;
  try {
    waypoint = await fetchWaypoint(slug);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      notFound();
    }
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-destructive">
          {t('error_loading')}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
      <WaypointDetailView waypoint={waypoint} user={user} />
    </main>
  );
}
