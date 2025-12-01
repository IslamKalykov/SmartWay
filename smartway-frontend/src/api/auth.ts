// src/api/auth.ts
import api from './client';

// === Типы ===
export interface User {
  id: number;
  phone_number: string;
  full_name: string;
  photo?: string;
  bio?: string;
  city?: string;
  birth_date?: string;
  is_driver: boolean;
  is_verified_driver: boolean;
  is_verified_passenger: boolean;
  trips_completed_as_driver: number;
  trips_completed_as_passenger: number;
  average_rating?: number;
  telegram_chat_id?: number;
}

export interface Car {
  id: number;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  car_type: string;
  passenger_seats: number;
  photo?: string;
  is_verified: boolean;
  has_air_conditioning: boolean;
  has_wifi: boolean;
  has_child_seat: boolean;
  allows_smoking: boolean;
  allows_pets: boolean;
  has_luggage_space: boolean;
}

export interface AuthTokens {
  access: string;
  refresh?: string;
  user?: User;
}

// === Auth API ===
export interface AuthTokensRaw {
  access?: string;
  access_token?: string;
  token?: string;
  refresh?: string;
  refresh_token?: string;
  user?: User;
  [key: string]: any;
}


/**
 * Отправить OTP код на номер телефона (через Telegram)
 */
export async function sendOtp(phone: string): Promise<{ detail: string }> {
  const response = await api.post('/users/send-otp/', {
    phone_number: phone,
  });
  return response.data;
}

/**
 * Нормализуем любые названия полей токенов в один формат
 */
function normalizeTokens(data: AuthTokensRaw): AuthTokens {
  const access =
    data.access ||
    data.access_token ||
    data.token ||
    '';

  const refresh =
    data.refresh ||
    data.refresh_token;

  if (!access) {
    // Здесь можно ещё логировать data, чтобы увидеть, что реально приходит
    console.error('No access token in response', data);
    throw new Error('Auth response does not contain access token');
  }

  return {
    access,
    refresh,
    user: data.user as User | undefined,
  };
}

/**
 * Подтвердить OTP код и получить токены
 */
export async function verifyOtp(phone: string, code: string): Promise<AuthTokens> {
  const response = await api.post('/users/verify-otp/', {
    phone_number: phone,
    otp_code: code,
  });

  const tokens = normalizeTokens(response.data);
  return tokens;
}

/**
 * Обновить токен
 */
export async function refreshToken(refresh: string): Promise<AuthTokens> {
  const response = await api.post('/users/token/refresh/', { refresh });
  const data = response.data as AuthTokensRaw;

  // Обычно refresh-эндпоинт возвращает только access,
  // но normalizeTokens это спокойно переварит
  const tokens = normalizeTokens({
    ...data,
    refresh, // чтобы не потерять текущий refresh
  });

  return tokens;
}

// === Profile API ===

/**
 * Получить свой профиль
 */
export async function getMyProfile(): Promise<User> {
  const response = await api.get('/users/me/');
  return response.data;
}

/**
 * Обновить профиль
 */
export async function updateProfile(data: Partial<User>): Promise<User> {
  const response = await api.patch('/users/me/', data);
  return response.data;
}

/**
 * Загрузить фото профиля
 */
export async function uploadPhoto(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('photo', file);
  
  const response = await api.patch('/users/me/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// === Cars API ===

/**
 * Получить мои автомобили
 */
export async function getMyCars(): Promise<Car[]> {
  const response = await api.get('/users/cars/');
  return response.data;
}

/**
 * Создать автомобиль
 */
export async function createCar(data: Partial<Car>): Promise<Car> {
  const response = await api.post('/users/cars/', data);
  return response.data;
}

/**
 * Обновить автомобиль
 */
export async function updateCar(id: number, data: Partial<Car>): Promise<Car> {
  const response = await api.patch(`/users/cars/${id}/`, data);
  return response.data;
}

/**
 * Удалить автомобиль
 */
export async function deleteCar(id: number): Promise<void> {
  await api.delete(`/users/cars/${id}/`);
}

// === Экспорт по умолчанию ===
export default {
  sendOtp,
  verifyOtp,
  refreshToken,
  getMyProfile,
  updateProfile,
  uploadPhoto,
  getMyCars,
  createCar,
  updateCar,
  deleteCar,
};