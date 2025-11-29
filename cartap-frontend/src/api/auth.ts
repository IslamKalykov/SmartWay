// src/api/auth.ts
import api from './client';

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
  is_approved: boolean;
  public_id?: string;
  trips_completed_as_driver: number;
  trips_completed_as_passenger: number;
  average_rating_as_driver?: number;
  average_rating_as_passenger?: number;
  reviews_count_as_driver: number;
  reviews_count_as_passenger: number;
  cars?: Car[];
  created_at: string;
}

export interface Car {
  id: number;
  owner: number;
  owner_name?: string;
  owner_photo?: string;
  owner_verified?: boolean;
  owner_rating?: number;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  car_type: string;
  full_name: string;
  plate_number: string;
  passenger_seats: number;
  photo?: string;
  has_air_conditioning: boolean;
  has_wifi: boolean;
  has_child_seat: boolean;
  allows_smoking: boolean;
  allows_pets: boolean;
  has_luggage_space: boolean;
  is_active: boolean;
  is_verified: boolean;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// ============ Auth API ============

export async function sendOtp(data: { phone_number: string }): Promise<void> {
  await api.post('/users/send-otp/', data);
}

export async function verifyOtp(data: {
  phone_number: string;
  otp_code: string;
  full_name?: string;
  role?: 'driver' | 'passenger';
}): Promise<AuthResponse> {
  const resp = await api.post<AuthResponse>('/users/verify-otp/', data);
  return resp.data;
}

// ============ Profile API ============

export async function getMyProfile(): Promise<User> {
  const resp = await api.get<User>('/users/me/');
  return resp.data;
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const resp = await api.patch<User>('/users/me/', data);
  return resp.data;
}

export async function uploadPhoto(file: File): Promise<{ photo_url: string }> {
  const formData = new FormData();
  formData.append('photo', file);
  
  const resp = await api.post<{ photo_url: string }>('/users/me/photo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
}

export async function switchRole(role: 'driver' | 'passenger'): Promise<{ is_driver: boolean }> {
  const resp = await api.post<{ is_driver: boolean }>('/users/me/switch-role/', { role });
  return resp.data;
}

// ============ Public Profile API ============

export async function getUserProfile(userId: number): Promise<User> {
  const resp = await api.get<User>(`/users/${userId}/profile/`);
  return resp.data;
}

// ============ Cars API ============

export async function getMyCars(): Promise<Car[]> {
  const resp = await api.get<Car[]>('/users/cars/');
  return resp.data;
}

export async function createCar(data: Partial<Car>): Promise<Car> {
  const resp = await api.post<Car>('/users/cars/', data);
  return resp.data;
}

export async function updateCar(carId: number, data: Partial<Car>): Promise<Car> {
  const resp = await api.patch<Car>(`/users/cars/${carId}/`, data);
  return resp.data;
}

export async function deleteCar(carId: number): Promise<void> {
  await api.delete(`/users/cars/${carId}/`);
}

// ============ Drivers API ============

export async function getDriversList(params?: {
  verified?: boolean;
  city?: string;
  seats_min?: number;
}): Promise<User[]> {
  const resp = await api.get<User[]>('/users/drivers/', { params });
  return resp.data;
}

export async function getDriverDetail(driverId: number): Promise<User> {
  const resp = await api.get<User>(`/users/drivers/${driverId}/`);
  return resp.data;
}

// ============ Verification API ============

export interface VerificationRequest {
  id: number;
  verification_type: 'driver' | 'passenger';
  status: 'pending' | 'approved' | 'rejected';
  admin_comment?: string;
  created_at: string;
}

export async function getVerificationStatus(): Promise<{
  is_verified_driver: boolean;
  is_verified_passenger: boolean;
  pending_driver_verification: boolean;
  pending_passenger_verification: boolean;
}> {
  const resp = await api.get('/users/verification/status/');
  return resp.data;
}

export async function createVerificationRequest(
  data: FormData
): Promise<VerificationRequest> {
  const resp = await api.post<VerificationRequest>('/users/verification/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
}

export async function getMyVerificationRequests(): Promise<VerificationRequest[]> {
  const resp = await api.get<VerificationRequest[]>('/users/verification/');
  return resp.data;
}

// ============ Reviews API ============

export async function getMyReceivedReviews(): Promise<any[]> {
  const resp = await api.get('/users/me/reviews/received/');
  return resp.data;
}

export async function getMyWrittenReviews(): Promise<any[]> {
  const resp = await api.get('/users/me/reviews/written/');
  return resp.data;
}