import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export async function Footer({ className }: { className?: string }) {
  const t = await getTranslations('footer');

  return (
    <footer className={cn('w-full bg-black', className)}>
      <div className="mx-auto flex justify-end max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-2 text-white antialiased">
        <ul className="flex lg:gap-4 flex-col lg:flex-row">
          <li>
            <Link href="/imprint" className="text-sm xl:text-base">
              {t('imprint')}
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="text-sm xl:text-base">
              {t('privacy')}
            </Link>
          </li>{' '}
          <li>
            <Link href="/tac" className="text-sm xl:text-base">
              {t('tac')}
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
