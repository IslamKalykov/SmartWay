// src/api/trips.ts
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

export type Trip = {
  id: number;
  from_location: string;
  to_location: string;
  departure_time: string;
  price: string | number;
  passengers_count: number;
  is_negotiable: boolean;
  status: string;
  passenger_name: string;
  passenger_phone?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_verified?: boolean;
  car_model?: string;
  car_plate?: string;
  car_seats?: number;
};

// Открытые (доступные) поездки
export async function fetchAvailableTrips(): Promise<Trip[]> {
  const resp = await axios.get(`${API_BASE}/trips/available/`, {
    withCredentials: true,
  });
  // если у тебя там пагинация:
  return resp.data.results ?? resp.data;
}

// Мои активные поездки (где я водитель и статус не completed/cancelled)
export async function fetchMyActiveTrips(): Promise<Trip[]> {
  const resp = await axios.get(`${API_BASE}/trips/my-active/`, {
    withCredentials: true,
  });
  return resp.data.results ?? resp.data;
}

// Мои завершённые поездки
export async function fetchMyCompletedTrips(): Promise<Trip[]> {
  const resp = await axios.get(`${API_BASE}/trips/my-completed/`, {
    withCredentials: true,
  });
  return resp.data.results ?? resp.data;
}
