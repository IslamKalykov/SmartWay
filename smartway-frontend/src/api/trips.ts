// src/api/trips.ts
import api from './client';
import type { SearchFilters } from '../components/SearchFilter';

export interface Trip {
  id: number;
  from_location: number | string;
  to_location: number | string;
  from_location_display?: string;
  to_location_display?: string;
  departure_time: string;
  passengers_count: number;
  price?: string | number | null;
  is_negotiable: boolean;
  status: string;
  contact_phone?: string;
  comment?: string;
  
  // Пассажир
  passenger?: number;
  passenger_name?: string;
  passenger_phone?: string;
  passenger_verified?: boolean;
  passenger_telegram?: string;
  
  // Водитель
  driver?: number | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_verified?: boolean | null;
  
  // Условия
  allow_smoking?: boolean;
  allow_pets?: boolean;
  allow_big_luggage?: boolean;
  baggage_help?: boolean;
  with_child?: boolean;
  prefer_verified_driver?: boolean;
  extra_rules?: string;
  
  created_at: string;
  updated_at?: string;
}

export interface TripCreateData {
  from_location: number;
  to_location: number;
  departure_time: string;
  passengers_count: number;
  price?: number | null;
  is_negotiable?: boolean;
  contact_phone?: string;
  comment?: string;
  prefer_verified_driver?: boolean;
  allow_smoking?: boolean;
  allow_pets?: boolean;
  allow_big_luggage?: boolean;
  baggage_help?: boolean;
  with_child?: boolean;
  extra_rules?: string;
}

// ============ Trips API (Заказы пассажиров) ============

export async function fetchAvailableTrips(filters?: SearchFilters): Promise<Trip[]> {
  const params: Record<string, any> = {};
  
  if (filters?.from_location) params.from_location = filters.from_location;
  if (filters?.to_location) params.to_location = filters.to_location;
  if (filters?.date) params.date = filters.date;
  
  const response = await api.get('/trips/available/', { params });
  
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data?.results) {
    return response.data.results;
  }
  return [];
}

export async function fetchMyTrips(): Promise<Trip[]> {
  const resp = await api.get('/trips/my/');
  if (Array.isArray(resp.data)) {
    return resp.data;
  }
  if (resp.data?.results) {
    return resp.data.results;
  }
  return [];
}

export async function fetchMyActiveTrips(): Promise<Trip[]> {
  const resp = await api.get('/trips/my-active/');
  if (Array.isArray(resp.data)) {
    return resp.data;
  }
  if (resp.data?.results) {
    return resp.data.results;
  }
  return [];
}

export async function fetchMyCompletedTrips(): Promise<Trip[]> {
  const resp = await api.get('/trips/my-completed/');
  if (Array.isArray(resp.data)) {
    return resp.data;
  }
  if (resp.data?.results) {
    return resp.data.results;
  }
  return [];
}

export async function getTripDetail(id: number): Promise<Trip> {
  const resp = await api.get<Trip>(`/trips/${id}/`);
  return resp.data;
}

export async function createTrip(data: TripCreateData): Promise<Trip> {
  const resp = await api.post<Trip>('/trips/', data);
  return resp.data;
}

export async function updateTrip(id: number, data: Partial<TripCreateData>): Promise<Trip> {
  const resp = await api.patch<Trip>(`/trips/${id}/`, data);
  return resp.data;
}

export async function takeTrip(id: number, carId?: number): Promise<Trip> {
  const resp = await api.post<Trip>(`/trips/${id}/take/`, carId ? { car_id: carId } : {});
  return resp.data;
}

export async function releaseTrip(id: number): Promise<Trip> {
  const resp = await api.post<Trip>(`/trips/${id}/release/`);
  return resp.data;
}

export async function finishTrip(id: number): Promise<Trip> {
  const resp = await api.post<Trip>(`/trips/${id}/finish/`);
  return resp.data;
}

export async function cancelTrip(id: number): Promise<Trip> {
  const resp = await api.post<Trip>(`/trips/${id}/cancel/`);
  return resp.data;
}

// ============ Reviews API ============

export interface Review {
  id: number;
  author: number;
  author_name: string;
  author_photo?: string;
  recipient: number;
  recipient_name: string;
  rating: number;
  text: string;
  was_on_time?: boolean;
  was_polite?: boolean;
  car_was_clean?: boolean;
  created_at: string;
}

export async function getMyReceivedReviews(): Promise<Review[]> {
  const resp = await api.get('/reviews/my_received/');
  if (Array.isArray(resp.data)) {
    return resp.data;
  }
  if (resp.data?.results) {
    return resp.data.results;
  }
  return [];
}

export async function getMyWrittenReviews(): Promise<Review[]> {
  const resp = await api.get('/reviews/my_written/');
  if (Array.isArray(resp.data)) {
    return resp.data;
  }
  if (resp.data?.results) {
    return resp.data.results;
  }
  return [];
}

export async function createReview(data: {
  trip?: number;
  booking?: number;
  rating: number;
  text?: string;
  was_on_time?: boolean;
  was_polite?: boolean;
  car_was_clean?: boolean;
}): Promise<Review> {
  const resp = await api.post<Review>('/reviews/', data);
  return resp.data;
}