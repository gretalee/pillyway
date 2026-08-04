'use client';

import type { ReactNode } from 'react';
import { OffCanvasContent } from '@/app/components/ui/OffCanvas';
import { useBurgerMenuStore } from '@/store/burger-menu-store';

interface PageShiftWrapperProps {
  children: ReactNode;
}

/**
 * Wraps the entire visible site (header, main, footer). Slides aside when
 * the burger menu opens, revealing BurgerMenuPanel — which is rendered as a
 * sibling behind this wrapper — underneath. See OffCanvasContent for the
 * shared push-menu mechanics (breakpoint-sized reveal, no scroll-lock side
 * effects of its own; BurgerMenuPanel toggles body overflow separately).
 */
export function PageShiftWrapper({ children }: PageShiftWrapperProps) {
  const open = useBurgerMenuStore((s) => s.open);

  return (
    <OffCanvasContent open={open} side="left" className="flex min-h-full flex-1 flex-col">
      {children}
    </OffCanvasContent>
  );
}
