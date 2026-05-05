import { API_URL } from '../config';

// --- Types ---

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  points: number;
  created_at: string;
}

export interface LoginResponse {
  status: string;
  data: {
    session: SupabaseSession;
    user: UserProfile;
  };
  message?: string;
}

export interface RegisterResponse {
  status: string;
  data: {
    user: UserProfile;
  };
  message?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}

// --- Functions ---

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Login gagal');
  }

  return data;
};

// Integrasi Login Google via Backend API
export const loginWithGoogle = async () => {
  const redirectTo = encodeURIComponent(`${window.location.origin}/login`);
  const response = await fetch(`${API_URL}/auth/google?redirectTo=${redirectTo}`);
  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal generate Google OAuth URL');
  }

  // Redirect ke URL yang diberikan backend — dilakukan di sini karena ini side effect
  // yang merupakan bagian inti dari flow OAuth, bukan navigasi UI biasa.
  window.location.href = data.data.url;
};

export const register = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Registrasi gagal');
  }

  return data;
};

export const getMe = async (): Promise<{ status: string; data: UserProfile }> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token');

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') throw new Error('Failed to get profile');
  return data;
};

/**
 * Hapus semua data sesi dari localStorage.
 * Navigasi setelah logout harus dilakukan oleh caller (komponen/hook),
 * bukan di service layer — menjaga SRP dan memudahkan testing.
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
};