// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru.json';
import en from './locales/en.json';
import ky from './locales/ky.json';

// Получаем сохранённый язык или язык браузера
const getInitialLanguage = (): string => {
  const saved = localStorage.getItem('language');
  if (saved && ['ru', 'en', 'ky'].includes(saved)) {
    return saved;
  }
  
  // Пробуем определить по браузеру
  const browserLang = navigator.language.split('-')[0];
  if (['ru', 'en', 'ky'].includes(browserLang)) {
    return browserLang;
  }
  
  return 'ru'; // По умолчанию русский
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

// Сохраняем язык при изменении
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  // Обновляем html lang атрибут
  document.documentElement.lang = lng;
});

export default i18n;