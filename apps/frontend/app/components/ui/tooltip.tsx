'use client';

import { useRef, useState } from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  delay?: number;
  'aria-label'?: string;
  triggerClassName?: string;
  children: React.ReactNode;
}

export function Tooltip({
  content,
  delay = 20,
  'aria-label': ariaLabel,
  triggerClassName,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  // Tracks whether the tooltip was opened by a touch tap so we can block the
  // pointerleave-triggered close that fires immediately after touchstart.
  const touchModeRef = useRef(false);
  const touchCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOpenChange(nextOpen: boolean, eventDetails: { reason: string }) {
    if (touchModeRef.current && !nextOpen) {
      // Allow outside-press to close; block hover-driven closes (pointerleave
      // fires immediately after touchstart and would close the tooltip at once).
      if (eventDetails.reason !== 'outside-press') return;
      // Closing due to outside press: exit touch mode and cancel the auto-close timer.
      touchModeRef.current = false;
      if (touchCloseTimerRef.current) {
        clearTimeout(touchCloseTimerRef.current);
        touchCloseTimerRef.current = null;
      }
    }
    setOpen(nextOpen);
  }

  function handleTouchStart() {
    if (touchCloseTimerRef.current) {
      clearTimeout(touchCloseTimerRef.current);
      touchCloseTimerRef.current = null;
    }
    if (touchModeRef.current) {
      // Second tap: close the tooltip and leave touch mode.
      touchModeRef.current = false;
      setOpen(false);
    } else {
      // First tap: open the tooltip in touch mode.
      touchModeRef.current = true;
      setOpen(true);
      // Auto-close after 3 s so the tooltip doesn't linger forever.
      touchCloseTimerRef.current = setTimeout(() => {
        touchModeRef.current = false;
        setOpen(false);
      }, 3000);
    }
  }

  return (
    <TooltipPrimitive.Provider delay={delay}>
      <TooltipPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <TooltipPrimitive.Trigger
          aria-label={ariaLabel}
          onTouchStart={handleTouchStart}
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
                'z-50 rounded-xs bg-black px-3 py-3 text-base text-white antialiased',
                'ring-1 ring-foreground/10 shadow-sm',
                'origin-(--transform-origin)',
                'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
                'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 ',
              )}>
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
