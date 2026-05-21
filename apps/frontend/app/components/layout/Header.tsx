import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonVariants } from '../ui/button';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
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
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      )}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold hover:opacity-80 transition-opacity"
          aria-label={t('aria_home')}>
          {t('home_label')}
        </Link>

        <div className="flex items-center gap-4">
          {isOwner && (
            <>
              <div className="max-sm:hidden">
                Roles: {user?.roles.map((r) => r.key).join(', ')}
              </div>
              <Link
                href="/backoffice"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                {t('backoffice')}
              </Link>
            </>
          )}

          <LanguageSwitcher />

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
