'use client';

import { useTranslations } from 'next-intl';

import { Tooltip } from '@/app/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function VerifiedBadge({ className }: { className?: string }) {
  const t = useTranslations('caminos');

  return (
    <Tooltip content={t('verified_tooltip')} aria-label={t('verified_icon_aria')}>
      <i
        className={cn('icon-award1 text-2xl text-pillyGreen-500 cursor-help', className)}
        aria-hidden="true"
      />
    </Tooltip>
  );
}
