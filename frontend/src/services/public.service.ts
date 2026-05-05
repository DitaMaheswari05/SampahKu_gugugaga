import { API_BASE_URL as API_URL } from '../config';

export interface DashboardStats {
  recovery_rate: number;
  tracked_products: number;
  active_users: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch(`${API_URL}/dashboard/stats`);
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat statistik');
  }
  return data.data;
};
