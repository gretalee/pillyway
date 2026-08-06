'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSideMenuStore } from '@/store/side-menu-store';
import type { OffCanvasSide } from '@/app/components/ui/SideMenu/OffCanvas';

const COUNTER_TRANSLATE: Record<OffCanvasSide, string> = {
  left: '-translate-x-[var(--off-canvas-size)]',
  right: 'translate-x-[var(--off-canvas-size)]',
  top: '-translate-y-[var(--off-canvas-size-vertical)]',
  bottom: 'translate-y-[var(--off-canvas-size-vertical)]',
};

interface OffCanvasPinProps {
  /** Sides for which this content should hold its position instead of
   * sliding away with the rest of the pushed page. */
  pinnedAgainst: OffCanvasSide[];
  children: ReactNode;
  className?: string;
}

/**
 * Cancels SideMenuViewport's push for chosen directions by applying the
 * exact inverse translate, so wrapped content (e.g. the site header) stays
 * put on screen instead of sliding away with the rest of the page. Useful
 * whenever a push direction would otherwise carry an always-visible element
 * off-screen entirely — e.g. a `bottom` panel pushing the header off the top
 * edge, leaving no visible way to tell the menu is even open, let alone
 * close it. For directions not listed in `pinnedAgainst`, this is a no-op —
 * content moves with the page exactly as it did before.
 *
 * `relative z-40` is always present, not just while pinning: an active
 * transform establishes a new stacking context, which would otherwise trap
 * a child's own z-index (e.g. the header's) inside it — this wrapper would
 * then compete against its siblings (main/footer) at the default "auto"
 * level and lose to whichever comes later in the DOM, regardless of what
 * z-index the header itself declares. Keeping it unconditional avoids that
 * flipping on and off as `shouldPin` toggles.
 */
export function OffCanvasPin({ pinnedAgainst, children, className }: OffCanvasPinProps) {
  const openSide = useSideMenuStore((s) => s.openSide);
  const isOpen = useSideMenuStore((s) => s.openId !== null);
  const shouldPin = isOpen && openSide !== null && pinnedAgainst.includes(openSide);

  return (
    <div
      className={cn(
        'relative z-40 transition-transform duration-300 ease-out',
        shouldPin && COUNTER_TRANSLATE[openSide as OffCanvasSide],
        className,
      )}>
      {children}
    </div>
  );
}
