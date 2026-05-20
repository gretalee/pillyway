'use client';

import { useTranslations } from 'next-intl';

import { Tooltip } from '@/app/components/ui/tooltip';

export function VerifiedBadge() {
  const t = useTranslations('caminos');

  return (
    <Tooltip content={t('verified_tooltip')} aria-label={t('verified_icon_aria')}>
      <i className="icon-sun-o text-2xl text-green-600" aria-hidden="true" />
    </Tooltip>
  );
}
