'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSideMenuStore } from '@/store/side-menu-store';
import type { SideMenuSide } from '@/store/side-menu-store';
import { OffCanvasContent, OffCanvasPanel } from '@/app/components/ui/SideMenu/OffCanvas';
import type { OffCanvasSide } from '@/app/components/ui/SideMenu/OffCanvas';

export type { SideMenuSide } from '@/store/side-menu-store';

/**
 * Controls one SideMenu instance by `id` from anywhere in the tree — a
 * header trigger button, a link, a keyboard shortcut, etc. Only needs the
 * `id`: the side it opens toward is declared once, on the matching
 * `<SideMenu side="...">` itself, and looked up from there.
 */
export function useSideMenu(id: string) {
  const isOpen = useSideMenuStore((s) => s.openId === id);
  const storeOpen = useSideMenuStore((s) => s.open);
  const storeClose = useSideMenuStore((s) => s.close);
  const storeToggle = useSideMenuStore((s) => s.toggle);

  return {
    isOpen,
    open: () => storeOpen(id),
    close: () => storeClose(id),
    toggle: () => storeToggle(id),
  };
}

interface SideMenuProps {
  /** Unique id — also used as the panel's DOM id and `aria-controls` target. */
  id: string;
  side?: SideMenuSide;
  /** Visible title, also doubles as the panel's accessible name. */
  title: string;
  /** Accessible name for the title-toggle button; falls back to `title`. */
  toggleAriaLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Self-contained side menu. Owns its open/closed state (via the shared
 * side-menu store, keyed by `id`), body scroll lock, Escape-to-close, and
 * focus-on-open — none of that needs to be reimplemented per menu. The
 * title bar doubles as the close control (a proper toggle button with
 * `aria-expanded`/`aria-controls`).
 *
 * Multiple instances can coexist (each with its own `id`); only one is open
 * at a time by design (see side-menu-store). `side` is declared here, in one
 * place — it's registered with the store on mount, so trigger buttons
 * elsewhere just call `useSideMenu(id)` without repeating it.
 *
 * `left`/`right`/`top` push the rest of the page aside (pair with a single
 * `<SideSlider>` wrapping the app content near the root). `bottom` is
 * different on purpose: it's a plain floating overlay — as tall as its
 * content, capped at half the viewport height, scrollable if it doesn't
 * fit — that doesn't move the page at all.
 */
export function SideMenu({
  id,
  side = 'left',
  title,
  toggleAriaLabel,
  children,
  className,
}: SideMenuProps) {
  const { isOpen, toggle, close } = useSideMenu(id);
  const registerSide = useSideMenuStore((s) => s.registerSide);
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const scrollYRef = useRef(0);
  const isBottomOverlay = side === 'bottom';

  useEffect(() => {
    registerSide(id, side);
  }, [id, side, registerSide]);

  useEffect(() => {
    if (isBottomOverlay) {
      if (isOpen) titleButtonRef.current?.focus();
      return;
    }

    if (isOpen) {
      scrollYRef.current = window.scrollY;
      window.scrollTo(0, 0);
      document.documentElement.style.overflowY = 'hidden';
      titleButtonRef.current?.focus();
    } else {
      document.documentElement.style.overflowY = '';
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.documentElement.style.overflowY = '';
    };
  }, [isOpen, isBottomOverlay]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const titleBar = (
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
  );

  const body = (
    <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">{children}</div>
  );

  if (isBottomOverlay) {
    return (
      <nav
        id={id}
        aria-label={title}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[50vh] flex-col',
          'bg-popover text-popover-foreground shadow-up',
          'transition-transform duration-300 ease-out',
          // Closed state overshoots 100% by a few px: the shadow extends
          // past the box's own edge, so translating by exactly its height
          // isn't quite enough to carry the shadow off-screen too — a sliver
          // stayed visible right at the bottom edge even while "closed".
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%+8px)]',
          className,
        )}>
        {titleBar}
        {body}
      </nav>
    );
  }

  return (
    <OffCanvasPanel
      as="nav"
      id={id}
      aria-label={title}
      open={isOpen}
      side={side as OffCanvasSide}
      className={className}>
      {titleBar}
      {body}
    </OffCanvasPanel>
  );
}

interface SideSliderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps the entire visible app (see layout.tsx) and slides it to the
 * side, when a SideMenu is open  (`left`/`right`/`top`)
 * A `bottom` menu never pushes — it floats above the page instead —
 * so it's treated the same as "nothing open" here.
 */
export function SideSlider({ children, className }: SideSliderProps) {
  const openSide = useSideMenuStore((s) => s.openSide);
  const openId = useSideMenuStore((s) => s.openId);
  const pushSide: OffCanvasSide | null =
    openSide && openSide !== 'bottom' ? openSide : null;
  const isOpen = openId !== null && pushSide !== null;

  return (
    <OffCanvasContent open={isOpen} side={pushSide ?? 'left'} className={className}>
      {children}
    </OffCanvasContent>
  );
}
