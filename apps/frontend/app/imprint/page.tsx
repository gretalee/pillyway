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
            E-Mail:{' '}
            <a href="mailto:hello@pillyway.de" target="_blank" rel="noopener noreferrer">
              hello@pillyway.de
            </a>
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

        <p>
          {t('open_source_body_2')}{' '}
          <a
            href="https://github.com/pillyway"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline">
            <svg
              data-component="Octicon"
              aria-hidden="true"
              focusable="false"
              className="inline-block align-text-bottom"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="currentColor"
              display="inline-block"
              overflow="visible">
              <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"></path>
            </svg>{' '}
            https://github.com/pillyway
          </a>
        </p>

        <h2 className="mt-4">{t('contact_heading')}</h2>

        <p>{t('contact_body')}</p>

        <p>
          <a
            href="mailto:hello@pillyway.de"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline">
            hello@pillyway.de
          </a>
        </p>
      </section>
    </div>
  );
}
