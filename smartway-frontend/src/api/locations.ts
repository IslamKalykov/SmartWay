// src/api/locations.ts
import api from './client';

export interface Location {
  id: number;
  code: string;
  name: string;
  name_ru?: string;
  name_en?: string;
  name_ky?: string;
  region?: string;
  sort_order: number;
  is_active: boolean;
}

// Тип для пагинированного ответа Django REST Framework
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Получить список всех локаций
 */
export async function fetchLocations(lang: string = 'ru', search?: string): Promise<Location[]> {
  const params: Record<string, string> = { lang };
  if (search) {
    params.search = search;
  }
  
  const response = await api.get('/locations/', { params });
  
  // Обработка пагинированного ответа
  if (Array.isArray(response.data)) {
    return response.data;
  }
  // Если это объект с results (пагинация DRF)
  if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  
  console.warn('Unexpected locations response format:', response.data);
  return [];
}

/**
 * Получить популярные локации (топ-10)
 */
export async function fetchPopularLocations(lang: string = 'ru'): Promise<Location[]> {
  const response = await api.get('/locations/popular/', { params: { lang } });
  
  // Обработка пагинированного ответа
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  
  console.warn('Unexpected popular locations response format:', response.data);
  return [];
}

/**
 * Получить локацию по ID
 */
export async function fetchLocationById(id: number, lang: string = 'ru'): Promise<Location> {
  const response = await api.get(`/locations/${id}/`, { params: { lang } });
  return response.data;
}

export default {
  fetchLocations,
  fetchPopularLocations,
  fetchLocationById,
};