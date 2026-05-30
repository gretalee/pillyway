import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export async function Footer({ className }: { className?: string }) {
  const t = await getTranslations('footer');

  return (
    <footer className={cn('w-full bg-black', className)}>
      <div
        className={cn(
          'mx-auto flex justify-between sm:justify-end items-start justify-between gap-2',
          'w-full max-w-7xl ',
          'px-4 sm:px-6 lg:px-8 py-2 text-white antialiased',
        )}>
        <ul className="flex sm:gap-4 flex-col sm:flex-row overflow-hidden">
          <li className="max-sm:hidden">
            <Link href="/imprint" className="text-sm xl:text-base">
              {t('imprint')}
            </Link>
          </li>
          <li className="truncate">
            <Link href="/privacy" className="text-sm xl:text-base truncate">
              {t('privacy')}
            </Link>
          </li>{' '}
          <li className="truncate">
            <Link href="/terms" className="text-sm xl:text-base truncate">
              {t('tac')}
            </Link>
          </li>
        </ul>

        <ul className="flex sm:gap-4 flex-col sm:flex-row sm:hidden">
          <li className="truncate">
            <Link href="/imprint" className="text-sm xl:text-base">
              {t('imprint')}
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
