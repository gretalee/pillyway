import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('contact');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Contact() {
  const t = await getTranslations('contact');

  return (
    <div className="w-full mt-10 mb-10">
      <section className={cn('max-w-4xl w-full mx-auto', 'px-4 sm:px-6 lg:px-8')}>
        <h1>{t('title')}</h1>
        <p>{t('body')}</p>
      </section>
    </div>
  );
}
