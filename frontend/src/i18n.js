import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ta from './locales/ta.json';

// Retrieve saved language preference or default to English
const savedLanguage = typeof localStorage !== 'undefined'
  ? (localStorage.getItem('solvane_language') || localStorage.getItem('i18nextLng') || 'en')
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Sync html lang attribute
if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLanguage;
}

export default i18n;
