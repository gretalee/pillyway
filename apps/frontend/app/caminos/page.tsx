import { getTranslations } from 'next-intl/server';
import { fetchCaminos } from '@/app/api/caminos/caminos';
import { getAuthUser } from '@/lib/getAuthUser';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '../components/ui/button';
import { CaminoListFilter } from './components/CaminoListFilter';

export default async function CaminosPage() {
  const t = await getTranslations('caminos');
  const user = await getAuthUser();
  const isPilgrim = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  let caminos: Awaited<ReturnType<typeof fetchCaminos>>;
  let error: Error | undefined;
  try {
    caminos = await fetchCaminos();
  } catch (e) {
    caminos = [];
    error = e instanceof Error ? e : new Error('Unknown error');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 lg:py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('browse')}</p>
      <p className="mt-2 text-muted-foreground">
        {t.rich('loginInInfo', {
          link: (chunks) => (
            <Link href="/api/auth/login" className="text-blue-600 inline hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>

      {/* Teaser: Email for new camino */}
      <div
        className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative"
        role="alert">
        {t('teaser.text')} {t('teaser.text_2')}
        <Link
          href="mailto:hello@pillyway.de"
          aria-label={t('teaser.aria_label')}
          className={cn(buttonVariants({ variant: 'outline' }), 'ml-2')}
          target="_blank"
          rel="noopener noreferrer">
          {t('teaser.link')}
        </Link>
      </div>

      {/* Error message */}
      <section className="mt-8 space-y-4">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t('error_loading')}
          </p>
        )}

        {caminos.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        )}

        {isPilgrim && !error && (
          <div className="">
            <Link
              href="/caminos/new"
              className={cn(buttonVariants({ variant: 'default' }))}>
              {t('create_link')}
            </Link>
          </div>
        )}
      </section>

      {/* Caminos list */}
      {caminos.length > 0 && !error && (
        <CaminoListFilter caminos={caminos} isPilgrim={isPilgrim} className="mt-8" />
      )}
    </div>
  );
}
