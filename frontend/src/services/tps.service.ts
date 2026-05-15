import { API_BASE_URL as API_URL } from '../config';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// --- Types ---

export interface TpsData {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string | null;
  province: string | null;
  capacity_tons_per_day: number;
  coordinates: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  radius_m: number;
  allowed_actions: string[];
  admin_id: string;
  created_at: string;
}

export interface CreateTpsPayload {
  name: string;
  type: string;
  address: string;
  city: string;
  province: string;
  capacity_tons_per_day?: number;
  coordinates: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  radius_m: number;
  allowed_actions: string[];
}

export interface CreatePetugasPayload {
  name: string;
  email: string;
  password: string;
}

export interface PetugasItem {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface DashboardDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardTopProduct {
  rank: number;
  name: string;
  gtin: string;
  total: number;
  trend: number;
}

export interface AdminTpsDashboardData {
  tps: TpsData;
  stats: {
    volume_label: string;
    volume_grams: number;
    total_waste: number;
    today: number;
    this_week: number;
    trends: {
      total_month: number;
      today: number;
      this_week: number;
    };
  };
  stages: DashboardDistributionItem[];
  categories: DashboardDistributionItem[];
  top_products: DashboardTopProduct[];
}

// --- Functions ---

/**
 * Register TPS baru — hanya ADMIN_TPS.
 */
export const registerTps = async (data: CreateTpsPayload): Promise<TpsData> => {
  const response = await fetch(`${API_URL}/tps`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Gagal mendaftarkan TPS');
  }

  return result.data;
};

/**
 * Get TPS milik admin yang sedang login.
 */
export const getMyTps = async (): Promise<TpsData | null> => {
  const response = await fetch(`${API_URL}/tps/me`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    // If 404 or no TPS, return null
    if (response.status === 404) return null;
    throw new Error(result.message || 'Gagal memuat data TPS');
  }

  return result.data;
};

/**
 * Get analytics dashboard TPS milik admin yang sedang login.
 */
export const getMyTpsDashboard = async (): Promise<AdminTpsDashboardData | null> => {
  const response = await fetch(`${API_URL}/tps/me/dashboard`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    if (response.status === 404) return null;
    throw new Error(result.message || 'Gagal memuat dashboard TPS');
  }

  return result.data;
};

/**
 * Buat akun petugas terikat ke TPS tertentu.
 */
export const createPetugas = async (
  tpsId: string,
  data: CreatePetugasPayload
): Promise<PetugasItem> => {
  const response = await fetch(`${API_URL}/tps/${tpsId}/petugas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Gagal membuat akun petugas');
  }

  return result.data;
};

/**
 * List semua petugas di TPS tertentu.
 */
export const getTpsPetugas = async (tpsId: string): Promise<PetugasItem[]> => {
  const response = await fetch(`${API_URL}/tps/${tpsId}/petugas`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Gagal memuat daftar petugas');
  }

  return result.data;
};

/**
 * Get daftar TPS publik (tanpa autentikasi).
 */
export const getPublicTpsList = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}/public/tps`);
  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Gagal memuat daftar TPS');
  }

  return result.data;
};
