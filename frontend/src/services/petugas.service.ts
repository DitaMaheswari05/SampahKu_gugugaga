const API_URL = 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface PetugasActivityItem {
  id: string;
  title: string;
  date: string;
  location: string;
  points: string;
}

export interface PetugasDashboardData {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    points: number;
  };
  summary: {
    totalPoints: number;
    totalUpdates: number;
    progressReward: number;
    remainingPoints: number;
  };
  activities: PetugasActivityItem[];
}

export const getPetugasDashboard = async (): Promise<PetugasDashboardData> => {
  const response = await fetch(`${API_URL}/petugas/dashboard`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat dashboard petugas');
  }

  return data.data;
};