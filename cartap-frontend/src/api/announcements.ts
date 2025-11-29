// src/api/announcements.ts
import api from './client';

export interface Announcement {
  id: number;
  from_location: string;
  to_location: string;
  departure_time: string;
  available_seats: number;
  booked_seats: number;
  free_seats: number;
  price_per_seat: string | number;
  is_negotiable: boolean;
  status: 'active' | 'full' | 'completed' | 'cancelled' | 'expired';
  contact_phone?: string;
  comment?: string;
  
  allow_smoking: boolean;
  allow_pets: boolean;
  allow_children: boolean;
  has_air_conditioning: boolean;
  intermediate_stops?: string;
  
  driver: number;
  driver_name: string;
  driver_phone?: string;
  driver_photo?: string;
  driver_verified: boolean;
  driver_rating?: number;
  driver_trips_count?: number;
  
  car?: number;
  car_info?: {
    id: number;
    brand: string;
    model: string;
    full_name?: string;
    year?: number;
    color?: string;
    plate_number?: string;
    passenger_seats?: number;
    photo?: string;
    is_verified?: boolean;
  };
  
  my_booking?: Booking;
  created_at: string;
  updated_at?: string;
}

export interface AnnouncementCreateData {
  from_location: string;
  to_location: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  is_negotiable?: boolean;
  contact_phone?: string;
  comment?: string;
  car?: number;
  allow_smoking?: boolean;
  allow_pets?: boolean;
  allow_children?: boolean;
  has_air_conditioning?: boolean;
  intermediate_stops?: string;
}

export interface Booking {
  id: number;
  announcement: number;
  announcement_info?: {
    id: number;
    from_location: string;
    to_location: string;
    departure_time: string;
    price_per_seat: string;
    driver_name: string;
  };
  passenger: number;
  passenger_name: string;
  passenger_phone?: string;
  passenger_photo?: string;
  passenger_verified: boolean;
  seats_count: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  message?: string;
  driver_comment?: string;
  contact_phone?: string;
  created_at: string;
}

// ============ Announcements API ============

export async function fetchAvailableAnnouncements(params?: {
  from?: string;
  to?: string;
  seats?: number;
}): Promise<Announcement[]> {
  const resp = await api.get('/announcements/available/', { params });
  return resp.data;
}

export async function fetchMyAnnouncements(): Promise<Announcement[]> {
  const resp = await api.get('/announcements/my/');
  return resp.data;
}

export async function getAnnouncementDetail(id: number): Promise<Announcement> {
  const resp = await api.get<Announcement>(`/announcements/${id}/`);
  return resp.data;
}

export async function createAnnouncement(data: AnnouncementCreateData): Promise<Announcement> {
  const resp = await api.post<Announcement>('/announcements/', data);
  return resp.data;
}

export async function updateAnnouncement(id: number, data: Partial<AnnouncementCreateData>): Promise<Announcement> {
  const resp = await api.patch<Announcement>(`/announcements/${id}/`, data);
  return resp.data;
}

export async function cancelAnnouncement(id: number): Promise<Announcement> {
  const resp = await api.post<Announcement>(`/announcements/${id}/cancel/`);
  return resp.data;
}

export async function completeAnnouncement(id: number): Promise<Announcement> {
  const resp = await api.post<Announcement>(`/announcements/${id}/complete/`);
  return resp.data;
}

export async function getAnnouncementBookings(id: number): Promise<Booking[]> {
  const resp = await api.get<Booking[]>(`/announcements/${id}/bookings/`);
  return resp.data;
}

// ============ Bookings API ============

export async function fetchMyBookings(): Promise<Booking[]> {
  const resp = await api.get('/bookings/my/');
  return resp.data;
}

export async function fetchIncomingBookings(): Promise<Booking[]> {
  const resp = await api.get('/bookings/incoming/');
  return resp.data;
}

export async function createBooking(data: {
  announcement: number;
  seats_count?: number;
  message?: string;
  contact_phone?: string;
}): Promise<Booking> {
  const resp = await api.post<Booking>('/bookings/', data);
  return resp.data;
}

export async function confirmBooking(id: number): Promise<Booking> {
  const resp = await api.post<Booking>(`/bookings/${id}/confirm/`);
  return resp.data;
}

export async function rejectBooking(id: number, comment?: string): Promise<Booking> {
  const resp = await api.post<Booking>(`/bookings/${id}/reject/`, { comment });
  return resp.data;
}

export async function cancelBooking(id: number): Promise<Booking> {
  const resp = await api.post<Booking>(`/bookings/${id}/cancel/`);
  return resp.data;
}