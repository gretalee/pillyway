import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonVariants } from '../components/ui/button';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('auth_error');
  return { title: t('meta_title') };
}

export default async function AuthErrorPage() {
  const t = await getTranslations('auth_error');

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-6 lg:py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">{t('message')}</p>
      <Link href="/api/auth/login" className={cn(buttonVariants(), 'mt-6')}>
        {t('retry')}
      </Link>
    </div>
  );
}
