// src/api/client.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// === Request interceptor ===
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    console.log('[API] Request:', config.method, config.url, 'token exists:', !!token);

    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// (response interceptor можешь оставить как есть либо доработать)
export default api;
