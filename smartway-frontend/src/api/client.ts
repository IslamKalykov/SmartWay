// src/api/client.ts
import axios from 'axios';
import i18n from '../i18n'; // <- импорт i18n

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    config.headers = config.headers || {};

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Добавляем заголовок Accept-Language
    // Берём 2-хсимвольный код: 'ru'|'en'|'ky'
    const lang = (i18n?.language || navigator.language || 'ru').slice(0, 2);
    config.headers['Accept-Language'] = lang;

    console.log('[API] Request:', config.method, config.url, 'lang:', lang, 'token exists:', !!token);
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
