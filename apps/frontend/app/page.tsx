import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import heroBg from '@/assets/img/IMG_4978.jpg';
// import heroBg from '@/assets/img/IMG_5240.jpg';
// import heroBg from '@/assets/img/IMG_5042.jpg';
// import heroBg from '@/assets/img/IMG_5244.jpg';
// import heroBg from '@/assets/img/IMG_5248.jpg';
// import heroBg from '@/assets/img/IMG_7513.jpg';

import leftImg from '@/assets/img/IMG_5064.jpg';

import { buttonVariants } from './components/ui/button';
import { cn } from '@/lib/utils';

export default async function Home() {
  const t = await getTranslations('home');

  return (
    <main className="w-full">
      <section className="relative bg-slate-100 py-16 h-[500px]">
        <Image src={heroBg} alt="" fill className="object-cover object-center" priority />
      </section>

      <section className="relative mt-2 xl:mt-8">
        <div
          className={cn(
            'relative z-10 max-w-[96dvw] 2xl:max-w-7xl w-full mx-auto',
            'px-4 sm:px-6 lg:px-8 pb-6  pt-10',
            'bg-white/80 rounded-lg shadow-lg',
          )}>
          <h1>{t('hero_title')}</h1>
          <p>
            {t('hero_body_1')}
            <br />
            {t('hero_body_2')}
          </p>
          <div className="flex justify-center mt-6">
            <Link
              href="/caminos"
              className={cn(buttonVariants({ variant: 'tertiary', size: 'xl' }))}>
              {t('hero_cta')}
              <i className="icon-chevron-right" />
              <i className="icon-chevron-right" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-16 bg-gray-100">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-10 ">
          <h2>{t('community_title')}</h2>
          <p>
            {t('community_body_1')}
            <br />
            {t('community_body_2')}
            <br />
            {t('community_body_3')}
          </p>

          <div className="mt-6 flex flex-col xl:flex-row items-stretch justify-start gap-6">
            <div className="relative max-lg:h-[400px] w-full xl:w-1/2 rounded overflow-hidden">
              <Image
                src={leftImg}
                alt=""
                fill
                className="object-cover object-center"
                priority
              />
            </div>
            <div className="w-full xl:w-1/2">
              <h2 className="text-lg font-normal">{t('features_title')}:</h2>
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
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 bg-pillyGreen-100">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-10">
          <h2>{t('by_pilgrims_title')}</h2>
          <p>
            {t('by_pilgrims_body_1')}
            <br />
            {t('by_pilgrims_body_2')}
            <br />
            {t('by_pilgrims_body_3')}
          </p>
        </div>
      </section>

      <section className="mt-16 flex justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-10 border rounded-lg border-slate-200 shadow-lg">
          <h2>{t('planned_title')}</h2>
          <p>{t('planned_intro')}</p>
          <ul className="list-disc pl-6">
            <li>{t('planned_maps')}</li>
            <li>{t('planned_gpx')}</li>
            <li>{t('planned_journals')}</li>
            <li>{t('planned_reviews')}</li>
            <li>{t('planned_difficulty')}</li>
            <li>{t('planned_languages')}</li>
          </ul>
        </div>
      </section>

      <section className="mt-16 bg-gray-100">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-10 text-center">
          <h2>{t('join_title')}</h2>
          <p>{t('join_body')}</p>
          <Link
            href="/api/auth/login"
            aria-label={t('join_cta_aria')}
            className={cn(buttonVariants({ variant: 'tertiary', size: 'xl' }), 'mt-4')}>
            {t('join_cta')}
          </Link>
        </div>
      </section>
    </main>
  );
}
