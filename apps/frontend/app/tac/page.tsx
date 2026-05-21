import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('tac');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function TermsAndConditions() {
  const t = await getTranslations('tac');

  return (
    <div className="w-full mt-10 mb-10">
      <section className={cn('max-w-4xl w-full mx-auto ', 'px-4 sm:px-6 lg:px-8')}>
        <h1>{t('title')}</h1>

        <p>{t('intro')}</p>

        <h2 className="mt-4">{t('purpose_heading')}</h2>

        <p>{t('purpose_body_1')}</p>

        <p>{t('purpose_body_2')}</p>

        <h2 className="mt-4">{t('account_heading')}</h2>

        <p>{t('account_body_1')}</p>

        <p>{t('account_body_2')}</p>

        <h2 className="mt-4">{t('ugc_heading')}</h2>

        <p>{t('ugc_body_1')}</p>

        <p>{t('ugc_body_2')}</p>

        <p>{t('ugc_body_3')}</p>

        <h2 className="mt-4">{t('prohibited_heading')}</h2>

        <p>{t('prohibited_intro')}</p>

        <ul className="list-disc py-2 pl-6">
          <li>{t('prohibited_illegal')}</li>
          <li>{t('prohibited_offensive')}</li>
          <li>{t('prohibited_misleading')}</li>
          <li>{t('prohibited_copyright')}</li>
          <li>{t('prohibited_spam')}</li>
        </ul>

        <h2 className="mt-4">{t('no_warranty_heading')}</h2>

        <p>{t('no_warranty_intro')}</p>

        <ul className="list-disc py-2 pl-6">
          <li>{t('no_warranty_accuracy')}</li>
          <li>{t('no_warranty_completeness')}</li>
          <li>{t('no_warranty_currency')}</li>
          <li>{t('no_warranty_safety')}</li>
        </ul>

        <p>{t('no_warranty_body')}</p>

        <h2 className="mt-4">{t('verification_heading')}</h2>

        <p>{t('verification_body_1')}</p>

        <p>{t('verification_body_2')}</p>

        <h2 className="mt-4">{t('moderation_heading')}</h2>

        <p>{t('moderation_body_1')}</p>

        <p>{t('moderation_body_2')}</p>

        <h2 className="mt-4">{t('liability_heading')}</h2>

        <p>{t('liability_body_1')}</p>

        <p>{t('liability_body_2')}</p>

        <h2 className="mt-4">{t('changes_heading')}</h2>

        <p>{t('changes_body_1')}</p>

        <p>{t('changes_body_2')}</p>

        <h2 className="mt-4">{t('open_source_heading')}</h2>

        <p>{t('open_source_body')}</p>

        <h2 className="mt-4">{t('contact_heading')}</h2>

        <p>{t('contact_body')}</p>

        <p>
          <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
        </p>
      </section>
    </div>
  );
}
