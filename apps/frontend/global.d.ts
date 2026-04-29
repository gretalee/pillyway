import de from './i18n/messages/de.json';

declare module 'next-intl' {
  interface AppConfig {
    messages: typeof de;
    locale: 'de' | 'en';
  }
}
