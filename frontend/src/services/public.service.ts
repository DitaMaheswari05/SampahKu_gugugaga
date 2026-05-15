import { API_BASE_URL as API_URL } from '../config';

export interface DashboardStats {
  recovery_rate: number;
  tracked_products: number;
  active_users: number;
  total_tps: number;
}

export interface PublicTpsItem {
  id: string;
  name: string;
  type: string;
  address: string;
  petugas_count: number;
  total_activities: number;
  recycled_count: number;
  recovery_rate: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch(`${API_URL}/dashboard/stats`);
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat statistik');
  }
  return data.data;
};

export const getPublicTpsList = async (): Promise<PublicTpsItem[]> => {
  const response = await fetch(`${API_URL}/public/tps`);
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat daftar TPS');
  }
  return data.data;
};
