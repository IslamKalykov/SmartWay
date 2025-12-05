// src/api/client.ts
import axios from 'axios';
import i18n from '../i18n';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const lang = (i18n?.language || navigator.language || 'ru').slice(0,2);
  config.headers['Accept-Language'] = lang;
  const token = localStorage.getItem('access_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
export default api;
