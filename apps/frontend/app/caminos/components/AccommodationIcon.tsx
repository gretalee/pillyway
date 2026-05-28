'use client';

import { Tooltip } from '@/app/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface AccommodationIconProps {
  hasAccommodation: boolean;
  className?: string;
}

export function AccommodationIcon({
  hasAccommodation,
  className,
}: AccommodationIconProps) {
  const t = useTranslations('camino_detail');
  const translatedLabel = t('accommodation_available');

  if (hasAccommodation) {
    return (
      <Tooltip content={translatedLabel} triggerClassName={cn('shrink-0', className)}>
        <i
          className={cn('icon-home text-pillyGreen-600 opacity-90 text-xs', className)}
          aria-hidden="true"
        />
      </Tooltip>
    );
  }
  return (
    <i className={cn('icon-home text-gray-300 text-xs', className)} aria-hidden="true" />
  );
}
