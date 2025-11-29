// src/api/trips.ts
import api from './client';

export interface Trip {
  id: number;
  from_location: string;
  to_location: string;
  departure_time: string;
  passengers_count: number;
  price: string | number | null;
  is_negotiable: boolean;
  status: 'open' | 'taken' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  contact_phone?: string;
  comment?: string;
  
  prefer_verified_driver?: boolean;
  allow_smoking?: boolean;
  has_luggage?: boolean;
  with_child?: boolean;
  with_pet?: boolean;
  
  passenger: number;
  passenger_name: string;
  passenger_phone?: string;
  passenger_photo?: string;
  passenger_verified?: boolean;
  
  driver?: number;
  driver_name?: string;
  driver_phone?: string;
  driver_photo?: string;
  driver_verified?: boolean;
  
  car?: number;
  car_info?: {
    id: number;
    brand: string;
    model: string;
    color?: string;
    plate_number: string;
    passenger_seats: number;
  };
  
  created_at: string;
  updated_at?: string;
}

export interface TripCreateData {
  from_location: string;
  to_location: string;
  departure_time: string;
  passengers_count: number;
  price?: number;
  is_negotiable?: boolean;
  contact_phone?: string;
  comment?: string;
  prefer_verified_driver?: boolean;
  allow_smoking?: boolean;
  has_luggage?: boolean;
  with_child?: boolean;
  with_pet?: boolean;
}

// ============ Trips API (Заказы пассажиров) ============

export async function fetchAvailableTrips(params?: {
  from?: string;
  to?: string;
}): Promise<Trip[]> {
  const resp = await api.get('/trips/available/', { params });
  return resp.data;
}

export async function fetchMyTrips(): Promise<Trip[]> {
  const resp = await api.get('/trips/my/');
  return resp.data;
}

export async function fetchMyActiveTrips(): Promise<Trip[]> {
  const resp = await api.get('/trips/my-active/');
  return resp.data;
}

export async function fetchMyCompletedTrips(): Promise<Trip[]> {
  const resp = await api.get('/trips/my-completed/');
  return resp.data;
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
  return resp.data;
}

export async function getMyWrittenReviews(): Promise<Review[]> {
  const resp = await api.get('/reviews/my_written/');
  return resp.data;
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