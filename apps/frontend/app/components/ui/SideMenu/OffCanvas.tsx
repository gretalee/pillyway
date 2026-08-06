'use client';

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type OffCanvasSide = 'left' | 'right' | 'top' | 'bottom';

/**
 * Panel size reads the `--off-canvas-size` custom property (defined in
 * global.css: at most 1/3 of the viewport on desktop, up to 2/3 on tablet,
 * full width/height minus a ~50px peek strip on mobile). CONTENT_OPEN_TRANSLATE
 * below reads the very same variable, so the panel is always exactly as
 * large as the space the pushed content vacated — the close button always
 * lands on-screen and panel text wraps at the true visible edge, never early.
 */
const PANEL_SIZE: Record<OffCanvasSide, string> = {
  left: 'w-[var(--off-canvas-size)]',
  right: 'w-[var(--off-canvas-size)]',
  top: 'h-[var(--off-canvas-size)]',
  bottom: 'h-[var(--off-canvas-size)]',
};

const PANEL_POSITION: Record<OffCanvasSide, string> = {
  left: 'inset-y-0 left-0',
  right: 'inset-y-0 right-0',
  top: 'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
};

const CONTENT_OPEN_TRANSLATE: Record<OffCanvasSide, string> = {
  left: 'translate-x-[var(--off-canvas-size)]',
  right: '-translate-x-[var(--off-canvas-size)]',
  top: 'translate-y-[var(--off-canvas-size)]',
  bottom: '-translate-y-[var(--off-canvas-size)]',
};

const CONTENT_CLOSED_TRANSLATE: Record<OffCanvasSide, string> = {
  left: 'translate-x-0',
  right: 'translate-x-0',
  top: 'translate-y-0',
  bottom: 'translate-y-0',
};

/**
 * Drop-shadow on the content's leading edge — the one that ends up
 * bordering the revealed panel once translated — as a visual boundary
 * between the still-visible content sliver and the panel underneath.
 * Harmless while closed: the offset shadow falls outside the viewport and
 * is clipped by the body's `overflow-x-hidden`.
 */
const CONTENT_SHADOW: Record<OffCanvasSide, string> = {
  left: 'shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.35)]',
  right: 'shadow-[8px_0_24px_-4px_rgba(0,0,0,0.35)]',
  top: 'shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.35)]',
  bottom: 'shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)]',
};

interface OffCanvasContentProps {
  open: boolean;
  side?: OffCanvasSide;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps content that gets pushed aside to reveal an OffCanvasPanel rendered
 * as a sibling behind it (same DOM/paint order as mmenu.js's page/menu
 * split). `side` is the edge the panel is anchored to — content always
 * translates away from that edge by exactly the panel's own size, and by
 * design never reaches a full 100% translate, so a sliver of the original
 * content stays visible on every breakpoint.
 */
export function OffCanvasContent({ open, side = 'left', children, className }: OffCanvasContentProps) {
  return (
    <div
      className={cn(
        'relative z-10 bg-background',
        'transition-transform duration-300 ease-out',
        open ? CONTENT_OPEN_TRANSLATE[side] : CONTENT_CLOSED_TRANSLATE[side],
        CONTENT_SHADOW[side],
        className,
      )}>
      {children}
    </div>
  );
}

type OffCanvasPanelOwnProps<T extends ElementType> = {
  as?: T;
  open: boolean;
  side?: OffCanvasSide;
  children: ReactNode;
  className?: string;
};

type OffCanvasPanelProps<T extends ElementType> = OffCanvasPanelOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof OffCanvasPanelOwnProps<T>>;

/**
 * Fixed panel revealed behind OffCanvasContent once it slides away. Renders
 * as a plain `div` by default; pass `as="nav"` (or any element/component) to
 * get the right semantics for the panel's content. Forwards any extra props
 * (aria-label, id, ...) to that underlying element.
 */
export function OffCanvasPanel<T extends ElementType = 'div'>({
  as,
  open,
  side = 'left',
  children,
  className,
  ...rest
}: OffCanvasPanelProps<T>) {
  const Component = (as ?? 'div') as ElementType;

  return (
    <Component
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed z-0 flex flex-col bg-popover text-popover-foreground',
        PANEL_POSITION[side],
        PANEL_SIZE[side],
        className,
      )}
      {...rest}>
      {children}
    </Component>
  );
}
