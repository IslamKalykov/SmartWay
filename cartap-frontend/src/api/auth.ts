// src/api/auth.ts
import { api } from './client';

export type SendOtpPayload = {
  phone_number: string;
};

export type VerifyOtpPayload = {
  phone_number: string;
  otp_code: string;
  full_name?: string;
  role?: 'driver' | 'passenger';
};

export async function sendOtp(data: SendOtpPayload) {
  const response = await api.post('/send-otp/', data);
  return response.data;
}

export async function verifyOtp(data: VerifyOtpPayload) {
  const response = await api.post('/verify-otp/', data);
  return response.data;
}
