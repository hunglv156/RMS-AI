import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  vi: { translation: { appName: 'RMS AI' } },
  en: { translation: { appName: 'RMS AI' } },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: 'vi',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
