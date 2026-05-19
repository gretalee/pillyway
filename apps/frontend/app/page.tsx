import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonVariants } from './components/ui/button';
import { cn } from '@/lib/utils';

export default async function Home() {
  const t = await getTranslations('home');

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <section className="mt-8 max-w-3xl">
        <h1>{t('hero_title')}</h1>
        <p>
          {t('hero_body_1')}
          <br />
          {t('hero_body_2')}
        </p>
        <Link href="/caminos" className="mt-4 text-blue-500 underline">
          {t('hero_cta')}
        </Link>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2>{t('community_title')}</h2>
        <p>
          {t('community_body_1')}
          <br />
          {t('community_body_2')}
          <br />
          {t('community_body_3')}
        </p>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2>{t('features_title')}</h2>
        <h3 className="mt-4">{t('feature_explore_title')}</h3>
        <p>{t('feature_explore_body')}</p>
        <h3 className="mt-4">{t('feature_accommodations_title')}</h3>
        <p>{t('feature_accommodations_body')}</p>
        <h3 className="mt-4">{t('feature_sights_title')}</h3>
        <p>{t('feature_sights_body')}</p>
        <h3 className="mt-4">{t('feature_contribute_title')}</h3>
        <p>{t('feature_contribute_body')}</p>
        <h3 className="mt-4">{t('feature_verify_title')}</h3>
        <p>{t('feature_verify_body')}</p>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2>{t('by_pilgrims_title')}</h2>
        <p>
          {t('by_pilgrims_body_1')}
          <br />
          {t('by_pilgrims_body_2')}
          <br />
          {t('by_pilgrims_body_3')}
        </p>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2>{t('planned_title')}</h2>
        <p>{t('planned_intro')}</p>
        <ul className="list-disc pl-6">
          <li>{t('planned_maps')}</li>
          <li>{t('planned_gpx')}</li>
          <li>{t('planned_journals')}</li>
          <li>{t('planned_reviews')}</li>
          <li>{t('planned_offline')}</li>
          <li>{t('planned_difficulty')}</li>
          <li>{t('planned_languages')}</li>
        </ul>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2>{t('join_title')}</h2>
        <p>{t('join_body')}</p>
        <Link
          href="/api/auth/login"
          aria-label={t('join_cta_aria')}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}>
          {t('join_cta')}
        </Link>
      </section>
    </main>
  );
}
