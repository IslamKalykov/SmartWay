// src/api/users.ts
import api from './client';

export interface CarInfo {
  id: number;
  brand: string;
  model: string;
  color: string;
  plate_number: string;
  year?: number;
  passenger_seats?: number;
  is_verified?: boolean;
}

export interface PublicUser {
  id: number;
  full_name: string;
  phone_number?: string;
  photo?: string;
  bio?: string;
  city?: string;
  telegram_username?: string;
  
  is_driver: boolean;
  is_verified_driver: boolean;
  is_verified_passenger: boolean;
  
  trips_completed_as_driver: number;
  trips_completed_as_passenger: number;
  average_rating: number | null;
  
  // Машины (только для водителей)
  cars?: CarInfo[];
  
  created_at?: string;
}

/**
 * Получить публичный профиль пользователя
 */
export async function getUserProfile(userId: number): Promise<PublicUser> {
  const response = await api.get(`/users/${userId}/profile/`);
  return response.data;
}