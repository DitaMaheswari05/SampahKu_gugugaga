import { API_URL } from '../config';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// --- Types ---

export interface CollectionItem {
  activity_id: string;
  collected_at: string;
  instance_id: string;
  gtin: string;
  current_status: string;
  identification_type: 'BATCH' | 'UNIQUE';
  batch_number: string | null;
  serial_number: string | null;
  last_updated: string;
  product_name: string;
  category: string | null;
  weight_grams: number | null;
}

export interface ActivityEvent {
  id: string;
  biz_step: string;
  location_name: string | null;
  facility_type: string | null;
  timestamp: string;
  evidence_url: string | null;
  epcis_body: Record<string, any> | null;
  blockchain_hash: string;
  profiles: {
    name: string;
    role: string;
  };
}

export interface InstanceDetail {
  id: string;
  gtin: string;
  current_status: string;
  identification_type: 'BATCH' | 'UNIQUE';
  batch_number: string | null;
  serial_number: string | null;
  last_updated: string;
  products: {
    product_name: string;
    category: string | null;
    weight_grams: number | null;
    profiles: {
      name: string;
    };
  };
}

export interface InstanceActivitiesResponse {
  instance: InstanceDetail;
  activities: ActivityEvent[];
}

// --- Functions ---

/** GET /users/me/collections — Daftar sampah yang pernah dikumpulkan konsumen */
export const getMyCollections = async (): Promise<CollectionItem[]> => {
  const response = await fetch(`${API_URL}/users/me/collections`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat koleksi sampah');
  }
  return data.data;
};

/** GET /instances/:id/activities — Timeline perjalanan sebuah instance */
export const getInstanceActivities = async (
  instanceId: string
): Promise<InstanceActivitiesResponse> => {
  const response = await fetch(`${API_URL}/instances/${instanceId}/activities`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat perjalanan sampah');
  }
  return data.data;
};

/** POST /instances/:id/scan dengan biz_step 'discarding' — Konfirmasi buang sampah */
export const discardInstance = async (instanceId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/instances/${instanceId}/scan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      biz_step: 'discarding',
      location_name: 'Pembuangan Konsumen',
      facility_type: 'RUMAH',
    }),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal menyimpan data sampah');
  }
};

/** Resolve GS1 Digital Link URL ke data product instance */
export const resolveGS1Link = async (url: string) => {
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
