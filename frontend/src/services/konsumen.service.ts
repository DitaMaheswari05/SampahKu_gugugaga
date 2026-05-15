// konsumen service
import { API_BASE_URL as API_URL } from '../config';

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
  instance_id?: string;
  gtin: string;
  current_status?: string;
  identification_type?: 'BATCH' | 'UNIQUE';
  batch_number?: string | null;
  serial_number?: string | null;
  last_updated?: string;
  product_name: string;
  category: string | null;
  weight_grams?: number | null;
  type: 'TIER_1' | 'TIER_2';
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
  /** Per-status count across all batch siblings. null for UNIQUE instances. */
  status_counts: Record<string, number> | null;
  /** Total number of physical items in this batch (= sibling instances). 1 for UNIQUE. */
  sibling_count: number;
}

export interface GtinAggregateStats {
  [biz_step: string]: {
    count: number;
    last_scanned_at: string;
  };
}

export interface ResolvedBarcodeProduct {
  gtin: string;
  product_name: string;
  category: string | null;
  source: string;
  image_url: string | null;
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

/** POST /instances/discard-barcode — Konfirmasi buang sampah dari barcode standar */
export const discardBarcode = async (gtin: string): Promise<void> => {
  const response = await fetch(`${API_URL}/instances/discard-barcode`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      gtin,
      location_name: 'Pembuangan Konsumen',
    }),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal menyimpan barcode sampah');
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

/**
 * Resolve barcode GTIN → product info (preview, tanpa merekam scan).
 * Digunakan untuk menampilkan info produk sebelum konfirmasi.
 */
export const resolveBarcode = async (
  gtin: string
): Promise<ResolvedBarcodeProduct> => {
  const response = await fetch(`${API_URL}/products/resolve-barcode/${gtin}`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat info produk');
  }

  return data.data;
};

/** GET /instances/:gtin/aggregate-stats — Statistik agregat Tier 2 (barcode scan) */
export const getGtinAggregateStats = async (gtin: string): Promise<GtinAggregateStats> => {
  const response = await fetch(`${API_URL}/instances/${gtin}/aggregate-stats`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat statistik barcode');
  }
  return data.data || {};
};

/** GET /instances/:gtin/aggregate-activities?limit=N — Aktivitas Tier 2 untuk GTIN.
 *  Gunakan limit besar (default 1000) agar semua aktivitas bisa di-aggregate per TPS.
 */
export const getGtinRecentActivities = async (gtin: string, limit: number = 1000) => {
  const response = await fetch(`${API_URL}/instances/${gtin}/aggregate-activities?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat aktivitas barcode');
  }
  return data.data || [];
};