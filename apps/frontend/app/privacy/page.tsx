import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('privacy');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Privacy() {
  const t = await getTranslations('privacy');

  return (
    <div className="w-full mt-10 mb-10">
      <section className={cn('max-w-4xl w-full mx-auto ', 'px-4 sm:px-6 lg:px-8')}>
        <h1>{t('title')}</h1>

        <p>{t('intro')}</p>

        <h2 className="mt-4">{t('responsible_heading')}</h2>

        <p>
          Hendrike Heydenreich
          <br />
          Witts Allee 34, 22587 Hamburg
          <br />
          Deutschland
        </p>

        <p>
          E-Mail:{' '}
          <a href="mailto:hello@pillyway.de" target="_blank" rel="noopener noreferrer">
            hello@pillyway.de
          </a>
        </p>

        <h2 className="mt-4">{t('general_heading')}</h2>

        <p>{t('general_body')}</p>

        <h2 className="mt-4">{t('data_heading')}</h2>

        <p>{t('data_intro')}</p>

        <ul className="list-disc py-2 pl-6">
          <li>{t('data_email')}</li>
          <li>{t('data_username')}</li>
          <li>{t('data_ip')}</li>
          <li>{t('data_logs')}</li>
          <li>{t('data_session')}</li>
          <li>{t('data_ugc')}</li>
        </ul>

        <h2 className="mt-4">{t('registration_heading')}</h2>

        <p>{t('registration_body_1')}</p>

        <p>{t('registration_body_2')}</p>

        <h2 className="mt-4">{t('ugc_heading')}</h2>

        <p>{t('ugc_body_1')}</p>

        <p>{t('ugc_body_2')}</p>

        <h2 className="mt-4">{t('hosting_heading')}</h2>

        <p>{t('hosting_body_1')}</p>

        <p>{t('hosting_body_2')}</p>

        <p>
          {t('hosting_body_3')}{' '}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer">
            https://supabase.com/privacy
          </a>
        </p>

        <h2 className="mt-4">{t('logs_heading')}</h2>

        <p>{t('logs_body_1')}</p>

        <p>{t('logs_body_2')}</p>

        <ul className="list-disc py-2 pl-6">
          <li>{t('logs_ip')}</li>
          <li>{t('logs_datetime')}</li>
          <li>{t('logs_browser')}</li>
          <li>{t('logs_os')}</li>
          <li>{t('logs_referrer')}</li>
        </ul>

        <p>{t('logs_body_3')}</p>

        <h2 className="mt-4">{t('cookies_heading')}</h2>

        <p>{t('cookies_body_1')}</p>

        <p>{t('cookies_body_2')}</p>

        <p>{t('cookies_body_3')}</p>

        <h2 className="mt-4">{t('legal_basis_heading')}</h2>

        <p>{t('legal_basis_intro')}</p>

        <ul className="list-disc py-2 pl-6">
          <li>{t('legal_basis_contract')}</li>
          <li>{t('legal_basis_interest')}</li>
        </ul>

        <h2 className="mt-4">{t('rights_heading')}</h2>

        <p>{t('rights_intro')}</p>

        <ul className="list-disc py-2 pl-6">
          <li>{t('rights_access')}</li>
          <li>{t('rights_rectification')}</li>
          <li>{t('rights_erasure')}</li>
          <li>{t('rights_restriction')}</li>
          <li>{t('rights_portability')}</li>
          <li>{t('rights_objection')}</li>
        </ul>

        <p>{t('rights_contact')}</p>

        <h2 className="mt-4">{t('retention_heading')}</h2>

        <p>{t('retention_body')}</p>

        <h2 className="mt-4">{t('security_heading')}</h2>

        <p>{t('security_body')}</p>

        <h2 className="mt-4">{t('changes_heading')}</h2>

        <p>{t('changes_body')}</p>

        <h2 className="mt-4">{t('contact_heading')}</h2>

        <p>{t('contact_body')}</p>

        <p>
          <a href="mailto:hello@pillyway.de" target="_blank" rel="noopener noreferrer">
            hello@pillyway.de
          </a>
        </p>
      </section>
    </div>
  );
}
