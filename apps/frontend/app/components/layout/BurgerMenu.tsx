'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useCaminos } from '@/app/api/caminos/use-caminos';
import { useBurgerMenuStore } from '@/store/burger-menu-store';
import { OffCanvasPanel } from '../ui/OffCanvas';
import BurgerIcon from '../ui/icons/BurgerIcon';

const CAMINO_MENU_LIMIT = 50;

const menuLinkClassName = cn(
  'block rounded-md px-2 py-2 text-sm font-medium text-foreground',
  'hover:bg-accent hover:text-accent-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const allCaminosLinkClassName = cn(menuLinkClassName, 'font-semibold');

const caminoLinkClassName = cn(menuLinkClassName, 'pl-4 font-normal');

/**
 * Trigger button rendered in the header. The panel itself lives in
 * BurgerMenuPanel (rendered once, outside the page-shift wrapper, in the root
 * layout) since the panel must sit behind the entire pushed page, not just
 * behind the header.
 */
export function BurgerMenu() {
  const open = useBurgerMenuStore((s) => s.open);
  const toggle = useBurgerMenuStore((s) => s.toggle);
  const tHeader = useTranslations('header');

  return (
    <button
      type="button"
      aria-label={tHeader('aria_burger_menu')}
      aria-expanded={open}
      aria-controls="burger-menu-panel"
      onClick={toggle}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-1.5',
        'text-foreground transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}>
      <BurgerIcon open={open} />
    </button>
  );
}

/**
 * Panel that sits fixed behind the page-shift wrapper, sized per breakpoint
 * by OffCanvasPanel (up to 1/3 width on desktop, 2/3 on tablet, full width
 * minus a peek strip on mobile). Visible once the wrapper (rendered
 * afterwards in the DOM, see layout.tsx) slides aside.
 */
export function BurgerMenuPanel() {
  const open = useBurgerMenuStore((s) => s.open);
  const setOpen = useBurgerMenuStore((s) => s.setOpen);
  const toggle = useBurgerMenuStore((s) => s.toggle);
  const t = useTranslations('burger_menu');
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const scrollYRef = useRef(0);

  const { data, isLoading, isError } = useCaminos(
    { limit: CAMINO_MENU_LIMIT },
    { enabled: open },
  );

  useEffect(() => {
    if (open) {
      // The pushed page wrapper (OffCanvasContent) translates via CSS
      // transform, which makes it an active containing block for the sticky
      // header nested inside it — so `position: sticky` no longer tracks the
      // real viewport while open. Background scrolling is locked either way,
      // so reset to the top so the header renders where the sliver expects
      // it, and restore the reading position once the panel closes again.
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  function handleNavigate() {
    setOpen(false);
  }

  return (
    <OffCanvasPanel
      as="nav"
      id="burger-menu-panel"
      aria-label={t('title')}
      open={open}
      side="left">
      <div className="border-b border-border">
        <div className="flex h-14 items-center px-4">
          <button
            ref={titleButtonRef}
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="burger-menu-panel"
            aria-label={t('close_aria')}
            className={cn(
              'rounded-md text-base font-semibold cursor-pointer',
              'hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}>
            {t('title')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        <Link
          href="/caminos"
          onClick={handleNavigate}
          className={cn(allCaminosLinkClassName, 'font-semibold text-pillyGreen-600')}>
          {t('all_caminos')}
        </Link>

        {isLoading && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">{t('loading')}</p>
        )}

        {isError && (
          <p role="alert" className="px-2 py-1.5 text-sm text-destructive">
            {t('error_loading')}
          </p>
        )}

        {!isLoading && !isError && data?.data.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">{t('empty')}</p>
        )}

        <ul>
          {data?.data.map((camino) => (
            <li key={camino.id}>
              <Link
                href={`/caminos/${camino.slug}`}
                onClick={handleNavigate}
                className={cn(caminoLinkClassName, 'text-gray-700')}>
                {camino.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="bg-green-400 w-full h-[500px]"></div>

        <div className="my-2 border-t border-border" />

        <Link href="/contact" onClick={handleNavigate} className={menuLinkClassName}>
          {t('contact')}
        </Link>
      </div>
    </OffCanvasPanel>
  );
}
