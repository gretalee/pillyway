'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SideMenu, useSideMenu } from '@/app/components/ui/SideMenu/SideMenu';

const TEST_RIGHT_MENU_ID = 'test-right-side-menu';

/**
 * Temporary trigger for exercising SideMenu with `side="right"` — proves a
 * second, independent instance can coexist with the burger menu. Remove once
 * a real right-side menu (or nothing) takes its place.
 */
export function TestRightSideMenuButton() {
  const { isOpen, toggle } = useSideMenu(TEST_RIGHT_MENU_ID, 'right');
  const t = useTranslations('test_side_menu');

  return (
    <button
      type="button"
      aria-label={t('aria_label')}
      aria-expanded={isOpen}
      aria-controls={TEST_RIGHT_MENU_ID}
      onClick={toggle}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-1.5',
        'text-foreground transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}>
      <i className="icon-cog text-xl" aria-hidden="true" />
    </button>
  );
}

export function TestRightSideMenuPanel() {
  const t = useTranslations('test_side_menu');

  return (
    <SideMenu id={TEST_RIGHT_MENU_ID} side="right" title={t('title')}>
      <p className="px-2 py-1.5 text-sm text-muted-foreground">{t('content')}</p>
    </SideMenu>
  );
}
