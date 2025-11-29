// src/api/locations.ts
import api from './client';

export interface Location {
  id: number;
  code: string;
  name: string;      // Название на текущем языке
  name_ru?: string;
  name_en?: string;
  name_ky?: string;
  region?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Получить список всех локаций
 * @param lang - язык (ru, en, ky)
 * @param search - строка поиска
 */
export async function fetchLocations(lang: string = 'ru', search?: string): Promise<Location[]> {
  const params: Record<string, string> = { lang };
  if (search) {
    params.search = search;
  }
  
  const response = await api.get('/locations/', { params });
  return response.data;
}

/**
 * Получить популярные локации (топ-10)
 * @param lang - язык (ru, en, ky)
 */
export async function fetchPopularLocations(lang: string = 'ru'): Promise<Location[]> {
  const response = await api.get('/locations/popular/', { params: { lang } });
  return response.data;
}

/**
 * Получить детали локации
 * @param id - ID локации
 * @param lang - язык (ru, en, ky)
 */
export async function fetchLocationById(id: number, lang: string = 'ru'): Promise<Location> {
  const response = await api.get(`/locations/${id}/`, { params: { lang } });
  return response.data;
}