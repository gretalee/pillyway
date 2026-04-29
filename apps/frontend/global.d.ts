import de from './messages/de.json';

declare module 'next-intl' {
  interface AppConfig {
    messages: typeof de;
    locale: 'de' | 'en';
  }
}
