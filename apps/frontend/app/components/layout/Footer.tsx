import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export async function Footer({ className }: { className?: string }) {
  const t = await getTranslations();

  return (
    <footer className={cn('w-full bg-black', className)}>
      <div className="mx-auto flex justify-end max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-2 text-white antialiased">
        <ul className="flex gap-4 ">
          <li>
            <Link href="/imprint">Impressum</Link>
          </li>
          <li>
            <Link href="/privacy">Datenschutzerklärung</Link>
          </li>{' '}
          <li>
            <Link href="/tac">Nutzungsbedingungen</Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
