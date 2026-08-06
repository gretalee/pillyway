'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useCaminos } from '@/app/api/caminos/use-caminos';
import { SideMenu, useSideMenu } from '@/app/components/ui/SideMenu/SideMenu';
import BurgerIcon from '@/app/components/ui/icons/BurgerIcon';

const BURGER_MENU_ID = 'burger-menu-panel';

export function BurgerMenuButton() {
  const tHeader = useTranslations('header');

  const { isOpen, toggle } = useSideMenu(BURGER_MENU_ID, 'left');

  return (
    <button
      type="button"
      aria-label={tHeader('aria_burger_menu')}
      aria-expanded={isOpen}
      aria-controls={BURGER_MENU_ID}
      onClick={toggle}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-1.5',
        'text-foreground transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}>
      <BurgerIcon open={isOpen} />
    </button>
  );
}

const menuLinkClassName = cn(
  'block rounded-md px-2 py-2 text-sm font-medium text-foreground',
  'hover:bg-accent hover:text-accent-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const CAMINO_MENU_LIMIT = 100;

export function BurgerMenuPanel() {
  const t = useTranslations('burger_menu');

  const { isOpen, close } = useSideMenu(BURGER_MENU_ID, 'left');

  const { data, isLoading, isError } = useCaminos(
    { limit: CAMINO_MENU_LIMIT },
    { enabled: isOpen },
  );

  return (
    <SideMenu
      id={BURGER_MENU_ID}
      side="left"
      title={t('title')}
      toggleAriaLabel={t('close_aria')}>
      {/* Title, that also toggles the menu */}
      <Link
        href="/caminos"
        onClick={close}
        className={cn(menuLinkClassName, 'font-semibold  text-pillyGreen-600')}>
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
        <p className="px-2 py-1.5 text-sm text-muted-foreground italic">{t('empty')}</p>
      )}

      <ul>
        {data?.data.map((camino) => (
          <li key={camino.id}>
            <Link
              href={`/caminos/${camino.slug}`}
              onClick={close}
              className={cn(menuLinkClassName, 'pl-4 font-normal text-gray-700')}>
              {camino.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="my-2 border-t border-border" />

      <Link href="/contact" onClick={close} className={menuLinkClassName}>
        {t('contact')}
      </Link>
    </SideMenu>
  );
}
