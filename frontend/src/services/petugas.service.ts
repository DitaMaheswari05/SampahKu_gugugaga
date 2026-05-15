import { API_BASE_URL as API_URL } from '../config';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getAuthHeadersMultipart(): Record<string, string> {
  const token = localStorage.getItem('token');
  // Jangan set Content-Type untuk multipart/form-data — biarkan browser set boundary otomatis.
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Types ---

export interface PetugasActivityItem {
  id: string;
  title: string;
  date: string;
  location: string;
}

export interface PetugasDashboardData {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tps: {
    id: string;
    name: string;
    type: string;
    address: string;
    city: string | null;
    province: string | null;
    capacity_tons_per_day: number;
    allowed_actions: string[];
  } | null;
  summary: {
    totalUpdates: number;
  };
  tps_stages: Record<string, number>; // label → percentage
  activities: PetugasActivityItem[];
}

export interface ProductInstanceResolved {
  id: string;
  gtin: string;
  current_status: string;
  identification_type: 'BATCH' | 'UNIQUE';
  batch_number: string | null;
  serial_number: string | null;
  products?: {
    product_name: string;
    category: string | null;
    profiles?: {
      name: string;
    } | null;
  };
}

export interface ScanPayload {
  biz_step: string;
  location_name: string;
  facility_type: string;
  material_type?: string;
  evidence_url?: string | null;
  coordinates?: { lat: number; lng: number };
}

// --- Functions ---

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

/**
 * Resolve GS1 Digital Link URL ke data product instance.
 * Parsing URL dilakukan di sini agar logika domain terpusat di service.
 */
export const resolveGS1Link = async (url: string): Promise<ProductInstanceResolved> => {
  const parts = url.split('/');
  const gtinIndex = parts.indexOf('01') + 1;
  const serialIndex = parts.indexOf('21') + 1;
  const batchIndex = parts.indexOf('10') + 1;

  const gtin = parts[gtinIndex];
  const serial = serialIndex > 0 ? parts[serialIndex] : null;
  const batch = batchIndex > 0 ? parts[batchIndex] : null;

  if (!gtin || (!serial && !batch)) {
    throw new Error('Format QR bukan GS1 Digital Link yang valid.');
  }

  let query = `?gtin=${gtin}`;
  if (serial) query += `&serial=${serial}`;
  if (batch) query += `&batch=${batch}`;

  const response = await fetch(`${API_URL}/products/resolve${query}`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat data produk');
  }

  return data.data;
};

/**
 * Upload foto bukti ke backend.
 * Backend yang menghandle upload ke Supabase Storage — frontend tidak berinteraksi
 * langsung dengan Supabase (sesuai arsitektur context.md).
 */
export const uploadEvidence = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('evidence', file);

  const response = await fetch(`${API_URL}/upload/evidence`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal upload foto bukti');
  }

  return data.data.evidence_url;
};

/**
 * Submit aktivitas scan petugas ke backend.
 */
export const scanInstance = async (
  instanceId: string,
  payload: ScanPayload
): Promise<void> => {
  const response = await fetch(`${API_URL}/instances/${instanceId}/scan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal menyimpan data scan');
  }
};

/**
 * Submit barcode scan untuk Tier 2 (agregat) ke backend.
 */
export const scanBarcode = async (
  gtin: string,
  payload: ScanPayload
): Promise<void> => {
  const response = await fetch(`${API_URL}/instances/scan-barcode`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ gtin, ...payload }),
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal menyimpan scan barcode');
  }
};
