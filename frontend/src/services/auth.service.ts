import { createClient } from '@supabase/supabase-js';

const API_URL = 'http://localhost:5000';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);

export interface LoginResponse {
  status: string;
  data: {
    session: any;
    user: any;
  };
  message?: string;
}

export interface RegisterResponse {
  status: string;
  data: {
    user: any;
  };
  message?: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Login gagal');
  }

  return data;
};

// Integrasi Login Google Asli via Supabase
export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Gagal login dengan Google');
  }

  return data;
};

export const register = async (payload: any): Promise<RegisterResponse> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Registrasi gagal');
  }

  return data;
};