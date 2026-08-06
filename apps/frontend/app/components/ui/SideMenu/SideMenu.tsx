'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSideMenuStore } from '@/store/side-menu-store';
import { OffCanvasContent, OffCanvasPanel } from '@/app/components/ui/SideMenu/OffCanvas';
import type { OffCanvasSide } from '@/app/components/ui/SideMenu/OffCanvas';

export type { OffCanvasSide } from '@/app/components/ui/SideMenu/OffCanvas';

/**
 * Controls one SideMenu instance by `id` from anywhere in the tree — a
 * header trigger button, a link, a keyboard shortcut, etc. `side` only
 * matters for `open`/`toggle` (it tells the shared content viewport which
 * way to push); reading `isOpen` or calling `close` needs just the `id`.
 */
export function useSideMenu(id: string, side: OffCanvasSide = 'left') {
  const isOpen = useSideMenuStore((s) => s.openId === id);
  const storeOpen = useSideMenuStore((s) => s.open);
  const storeClose = useSideMenuStore((s) => s.close);
  const storeToggle = useSideMenuStore((s) => s.toggle);

  return {
    isOpen,
    open: () => storeOpen(id, side),
    close: () => storeClose(id),
    toggle: () => storeToggle(id, side),
  };
}

interface SideMenuProps {
  /** Unique id — also used as the panel's DOM id and `aria-controls` target. */
  id: string;
  side?: OffCanvasSide;
  /** Visible title, also doubles as the panel's accessible name. */
  title: string;
  /** Accessible name for the title-toggle button; falls back to `title`. */
  toggleAriaLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Self-contained off-canvas side menu. Owns its open/closed state (via the
 * shared side-menu store, keyed by `id`), body scroll lock + scroll-position
 * restore, Escape-to-close, and focus-on-open — none of that needs to be
 * reimplemented per menu. The title bar doubles as the close control (a
 * proper toggle button with `aria-expanded`/`aria-controls`).
 *
 * Multiple instances can coexist (each with its own `id`); only one is open
 * at a time by design (see side-menu-store). Pair with a single
 * `<SideMenuViewport>` wrapping the app content near the root, and
 * `useSideMenu(id, side)` for trigger buttons anywhere else in the tree.
 */
export function SideMenu({
  id,
  side = 'left',
  title,
  toggleAriaLabel,
  children,
  className,
}: SideMenuProps) {
  const { isOpen, toggle, close } = useSideMenu(id, side);
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      // SideMenuViewport translates via CSS transform, which makes it an
      // active containing block for any sticky descendants (e.g. a sticky
      // header) — so position:sticky no longer tracks the real viewport
      // while open. Background scrolling is locked either way, so reset to
      // the top and restore the reading position once the panel closes.
      scrollYRef.current = window.scrollY;
      window.scrollTo(0, 0);
      document.body.style.overflowY = 'hidden';
      titleButtonRef.current?.focus();
    } else {
      document.body.style.overflowY = '';
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.overflowY = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  return (
    <OffCanvasPanel
      as="nav"
      id={id}
      aria-label={title}
      open={isOpen}
      side={side}
      className={className}>
      <div className="border-b border-border">
        <div className="flex h-14 items-center px-4">
          <button
            ref={titleButtonRef}
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-controls={id}
            aria-label={toggleAriaLabel}
            className={cn(
              'rounded-md text-base font-semibold cursor-pointer',
              'hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}>
            {title}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {children}
      </div>
    </OffCanvasPanel>
  );
}

interface SideMenuViewportProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps the entire visible app once near the root (see layout.tsx). Slides
 * aside toward whichever SideMenu is currently open, revealing it
 * underneath. Renders untransformed (`side="left"`, closed) when nothing is
 * open — the side only matters once something opens.
 */
export function SideMenuViewport({ children, className }: SideMenuViewportProps) {
  const openSide = useSideMenuStore((s) => s.openSide);
  const isOpen = useSideMenuStore((s) => s.openId !== null);

  return (
    <OffCanvasContent open={isOpen} side={openSide ?? 'left'} className={className}>
      {children}
    </OffCanvasContent>
  );
}
