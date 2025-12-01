// src/api/locations.ts
import api from './client';

export interface Location {
  id: number;
  code: string;
  name: string;  // Вычисляемое поле на основе языка
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
 * Добавляет поле `name` на основе текущего языка
 */
function transformLocation(loc: any, lang: string): Location {
  const nameKey = `name_${lang}` as keyof typeof loc;
  return {
    ...loc,
    name: loc[nameKey] || loc.name_ru || loc.name_en || loc.code,
  };
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
  
  let locations: any[] = [];
  
  // Обработка пагинированного ответа
  if (Array.isArray(response.data)) {
    locations = response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    locations = response.data.results;
  } else {
    console.warn('Unexpected locations response format:', response.data);
    return [];
  }
  
  // Трансформируем каждую локацию, добавляя поле name
  return locations.map(loc => transformLocation(loc, lang));
}

/**
 * Получить популярные локации (топ-10)
 */
export async function fetchPopularLocations(lang: string = 'ru'): Promise<Location[]> {
  const response = await api.get('/locations/popular/', { params: { lang } });
  
  let locations: any[] = [];
  
  // Обработка пагинированного ответа
  if (Array.isArray(response.data)) {
    locations = response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    locations = response.data.results;
  } else {
    console.warn('Unexpected popular locations response format:', response.data);
    return [];
  }
  
  // Трансформируем каждую локацию, добавляя поле name
  return locations.map(loc => transformLocation(loc, lang));
}

/**
 * Получить локацию по ID
 */
export async function fetchLocationById(id: number, lang: string = 'ru'): Promise<Location> {
  const response = await api.get(`/locations/${id}/`, { params: { lang } });
  return transformLocation(response.data, lang);
}

export default {
  fetchLocations,
  fetchPopularLocations,
  fetchLocationById,
};