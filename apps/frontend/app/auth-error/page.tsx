import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata() {
  const t = await getTranslations('auth_error');
  return { title: t('meta_title') };
}

export default async function AuthErrorPage() {
  const t = await getTranslations('auth_error');

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">{t('message')}</p>
      <Link
        href="/api/auth/login"
        className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {t('retry')}
      </Link>
    </main>
  );
}
