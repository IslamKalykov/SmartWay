// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru.json';
import en from './locales/en.json';
import ky from './locales/ky.json';

// <-- добавляем dayjs и локали
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import 'dayjs/locale/ky';
// ------------------------------

const getInitialLanguage = (): string => {
  const saved = localStorage.getItem('language');
  if (saved && ['ru', 'en', 'ky'].includes(saved)) {
    return saved;
  }

  const browserLang = navigator.language.split('-')[0];
  if (['ru', 'en', 'ky'].includes(browserLang)) {
    return browserLang;
  }

  return 'ru';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      ky: { translation: ky },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

// Устанавливаем dayjs локаль сразу при старте
dayjs.locale(i18n.language || getInitialLanguage());

// Сохраняем язык при изменении
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  // Обновляем html lang атрибут
  document.documentElement.lang = lng;

  // <-- синхронизируем dayjs локаль
  // используем первые 2 символа, ожидая 'ru'|'en'|'ky'
  const langCode = (lng || 'ru').slice(0, 2);
  dayjs.locale(langCode);
});
export default i18n;
