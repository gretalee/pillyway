'use client';

import { BadgeCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Tooltip } from '@/app/components/ui/tooltip';

export function VerifiedBadge() {
  const t = useTranslations('caminos');

  return (
    <Tooltip content={t('verified_tooltip')} aria-label={t('verified_icon_aria')}>
      <BadgeCheck className="size-5 text-green-600" aria-hidden="true" />
    </Tooltip>
  );
}
