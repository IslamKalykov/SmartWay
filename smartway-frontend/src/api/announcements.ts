// src/api/announcements.ts
import api from './client';
import type { SearchFilters } from '../components/SearchFilter'; // если ещё нет

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
  has_review_from_me?: boolean;
  created_at: string;
}

function getLang(explicitLang?: string) {
  return (
    explicitLang ||
    (typeof localStorage !== 'undefined' &&
      (localStorage.getItem('i18nextLng') || '').slice(0, 2)) ||
    'ru'
  );
}

// ============ Announcements API ============

export async function fetchAvailableAnnouncements(
  filters?: SearchFilters,
  lang?: string,
): Promise<Announcement[]> {
  const lng = getLang(lang);

  const params: Record<string, any> = {};
  if (filters?.from_location) params.from = filters.from_location;
  if (filters?.to_location) params.to = filters.to_location;
  if (filters?.date) params.date = filters.date;
  params.lang = lng;

  const response = await api.get('/announcements/available/', {
    params,
    headers: { 'Accept-Language': lng },
  });

  if (Array.isArray(response.data)) return response.data;
  if (response.data?.results) return response.data.results;
  return [];
}

export async function fetchMyAnnouncements(lang?: string): Promise<Announcement[]> {
  const lng = getLang(lang);

  const resp = await api.get('/announcements/my/', {
    params: { lang: lng },
    headers: { 'Accept-Language': lng },
  });

  if (Array.isArray(resp.data)) return resp.data;
  if (resp.data?.results) return resp.data.results;
  return [];
}

export async function getAnnouncementDetail(id: number, lang?: string): Promise<Announcement> {
  const lng = getLang(lang);
  const resp = await api.get<Announcement>(`/announcements/${id}/`, {
    params: { lang: lng },
    headers: { 'Accept-Language': lng },
  });
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

export async function fetchIncomingBookings(lang?: string): Promise<Booking[]> {
  const lng = getLang(lang);

  const resp = await api.get('/bookings/incoming/', {
    params: { lang: lng },
    headers: { 'Accept-Language': lng },
  });

  if (Array.isArray(resp.data)) return resp.data;
  if (resp.data?.results) return resp.data.results;
  return [];
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