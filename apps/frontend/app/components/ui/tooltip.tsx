'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  'aria-label'?: string;
  triggerClassName?: string;
  children: React.ReactNode;
}

export function Tooltip({
  content,
  'aria-label': ariaLabel,
  triggerClassName,
  children,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          aria-label={ariaLabel}
          className={cn(
            'inline-flex cursor-default items-center rounded',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            triggerClassName,
          )}>
          {children}
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
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
