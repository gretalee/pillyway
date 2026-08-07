import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonVariants } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/app/components/layout/UserMenu';
import { LanguageSwitcher } from '@/app/components/layout/LanguageSwitcher';
import { BurgerMenuButton } from '@/app/components/layout/BurgerMenu';
import { TestRightSideMenuButton } from '@/app/components/layout/TestRightSideMenu';
import type { AuthUser } from '@/lib/getAuthUser';

interface HeaderProps {
  user: AuthUser | null;
}

export async function Header({ user }: HeaderProps) {
  const t = await getTranslations('header');
  const isOwner = user?.roles.some((r) => r.key === 'owner') ?? false;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-border',
        'bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60',
      )}>
      <div className="mx-auto overflow-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <BurgerMenuButton />

          <Link
            href="/"
            className="text-lg font-semibold hover:opacity-80 transition-opacity translate-y-0.5"
            aria-label={t('aria_home')}>
            {t('home_label')}
          </Link>
        </div>

        <div className="flex items-center gap-1 md:gap-4">
          {isOwner && (
            <>
              <Link
                href="/backoffice"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                {t('backoffice')}
              </Link>
            </>
          )}

          <LanguageSwitcher />

          {process.env.NODE_ENV !== 'production' && <TestRightSideMenuButton />}

          <nav aria-label={t('aria_account_nav')}>
            {user ? (
              <UserMenu firstName={user.firstName} />
            ) : (
              <Link
                href="/api/auth/login"
                aria-label={t('aria_login')}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                {t('login')}
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
