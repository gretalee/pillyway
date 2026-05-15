import { getTranslations } from 'next-intl/server';
import type { WaypointDetail } from '@/app/api/waypoints/waypoint-types';
import type { AuthUser } from '@/lib/getAuthUser';
import { WaypointDetailClient } from './WaypointDetailClient';

interface Props {
  waypoint: WaypointDetail;
  user: AuthUser | null;
}

export async function WaypointDetailView({ waypoint, user }: Props) {
  const t = await getTranslations('waypoint_detail');
  const tCountries = await getTranslations('countries');

  const translations = {
    back_label: t('back_label'),
    accommodations_heading: t('accommodations_heading'),
    sights_heading: t('sights_heading'),
    no_accommodations: t('no_accommodations'),
    no_sights: t('no_sights'),
    add_accommodation: t('add_accommodation'),
    add_sight: t('add_sight'),
    verified_badge: t('verified_badge'),
    edit_accommodation_label: t('edit_accommodation_label'),
    delete_accommodation_label: t('delete_accommodation_label'),
    edit_sight_label: t('edit_sight_label'),
    delete_sight_label: t('delete_sight_label'),
    country: tCountries(waypoint.country.toLowerCase()),
    accommodation_type: {
      hostel: t('accommodation_type.hostel'),
      monastery: t('accommodation_type.monastery'),
      b_and_b: t('accommodation_type.b_and_b'),
      hotel: t('accommodation_type.hotel'),
      apartment: t('accommodation_type.apartment'),
      private_room: t('accommodation_type.private_room'),
    },
    price_range: {
      budget: t('price_range.budget'),
      moderate: t('price_range.moderate'),
      comfortable: t('price_range.comfortable'),
      luxury: t('price_range.luxury'),
    },
  };

  const canContribute = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  return (
    <WaypointDetailClient
      waypoint={waypoint}
      canContribute={canContribute}
      translations={translations}
    />
  );
}
