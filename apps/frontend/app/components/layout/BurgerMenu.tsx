'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Menu as MenuIcon, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { buttonVariants } from '../ui/button';
import { useCaminos } from '@/app/api/caminos/use-caminos';

const CAMINO_MENU_LIMIT = 50;

const menuLinkClassName = cn(
  'block rounded-md px-2 py-2 text-sm font-medium text-foreground',
  'hover:bg-accent hover:text-accent-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('burger_menu');
  const tHeader = useTranslations('header');

  const { data, isLoading, isError } = useCaminos(
    { limit: CAMINO_MENU_LIMIT },
    { enabled: open },
  );

  function handleNavigate() {
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label={tHeader('aria_burger_menu')}
        className={cn(
          'inline-flex items-center justify-center rounded-lg p-1.5',
          'text-foreground transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}>
        <MenuIcon className="size-5" aria-hidden="true" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/20 duration-150',
            'data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex h-full w-4/5 max-w-xs flex-col',
            'bg-popover text-popover-foreground shadow-lg outline-none ring-1 ring-foreground/10',
            'sm:inset-y-auto sm:top-14 sm:h-auto sm:max-h-[70vh] sm:w-72 sm:rounded-r-xl',
            'duration-150',
            'data-open:animate-in data-open:slide-in-from-left data-open:fade-in-0',
            'data-closed:animate-out data-closed:slide-out-to-left data-closed:fade-out-0',
          )}>
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <DialogPrimitive.Title className="text-base font-semibold">
              {t('title')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
              aria-label={t('close_aria')}>
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <nav aria-label={t('title')} className="flex-1 overflow-y-auto px-2 py-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('caminos_heading')}
            </p>

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
                    className={menuLinkClassName}>
                    {camino.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="my-2 border-t border-border" />

            <Link href="/contact" onClick={handleNavigate} className={menuLinkClassName}>
              {t('contact')}
            </Link>
          </nav>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
