'use client';

import { BadgeCheck } from 'lucide-react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export function VerifiedBadge() {
  const t = useTranslations('caminos');

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          aria-label={t('verified_icon_aria')}
          className="inline-flex cursor-default items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BadgeCheck className="size-5 text-green-600" aria-hidden="true" />
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner sideOffset={4}>
            <TooltipPrimitive.Popup
              className={cn(
                'z-50 rounded-md bg-popover px-2.5 py-1 text-xs text-popover-foreground',
                'ring-1 ring-foreground/10 shadow-sm',
                'origin-(--transform-origin)',
                'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
                'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              )}>
              {t('verified_tooltip')}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
