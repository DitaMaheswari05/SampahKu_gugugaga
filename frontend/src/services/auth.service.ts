const API_URL = 'http://localhost:5000';

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

export const getMe = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token');
  
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') throw new Error('Failed to get profile');
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  window.location.href = '/login';
};