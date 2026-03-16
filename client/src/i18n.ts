import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import so from './locales/so.json';

const savedLanguage = typeof window !== 'undefined' 
  ? localStorage.getItem('barbaarintasan-lang') || 'so' 
  : 'so';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      so: { translation: so },
    },
    lng: savedLanguage,
    fallbackLng: 'so',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
