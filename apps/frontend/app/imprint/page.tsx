import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('imprint');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Imprint() {
  const t = await getTranslations('imprint');

  return (
    <div className="w-full mt-10 mb-10">
      <section className={cn('max-w-4xl w-full mx-auto ', 'px-4 sm:px-6 lg:px-8')}>
        <h1>{t('title')}</h1>

        <p>{t('legal_notice')}</p>

        <h2 className="mt-4">{t('operator_heading')}</h2>

        <div>
          <p>
            Hendrike Heydenreich
            <br />
            Witts Allee 34
            <br />
            22587 Hamburg
            <br />
            Deutschland
          </p>

          <p>
            E-Mail: <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
          </p>
        </div>

        <h2 className="mt-4">{t('responsible_heading')}</h2>

        <p>
          Hendrike Heydenreich
          <br />
          Witts Allee 34
          <br />
          22587 Hamburg
          <br />
          Deutschland
        </p>

        <h2 className="mt-4">{t('liability_content_heading')}</h2>

        <p>{t('liability_content_body_1')}</p>

        <p>{t('liability_content_body_2')}</p>

        <h2 className="mt-4">{t('liability_links_heading')}</h2>

        <p>{t('liability_links_body')}</p>

        <h2 className="mt-4">{t('copyright_heading')}</h2>

        <p>{t('copyright_body_1')}</p>

        <p>{t('copyright_body_2')}</p>

        <h2 className="mt-4">{t('ugc_heading')}</h2>

        <p>{t('ugc_body_1')}</p>

        <p>{t('ugc_body_2')}</p>

        <ul className="list-disc py-2 pl-6">
          <li>{t('ugc_item_completeness')}</li>
          <li>{t('ugc_item_accuracy')}</li>
          <li>{t('ugc_item_currency')}</li>
          <li>{t('ugc_item_safety')}</li>
        </ul>

        <p>{t('ugc_body_3')}</p>

        <h2 className="mt-4">{t('open_source_heading')}</h2>

        <p>{t('open_source_body_1')}</p>

        <p>{t('open_source_body_2')}</p>

        <h2 className="mt-4">{t('contact_heading')}</h2>

        <p>{t('contact_body')}</p>

        <p>
          <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
        </p>
      </section>
    </div>
  );
}
