import { API_URL } from '../config';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// --- Types ---

export interface ProductStats {
  total: number;
  recycled: number;
  disposed: number;
  in_market: number;
  in_progress: number;
}

export interface MaterialPassport {
  '@context': string;
  '@type': string;
  material: Array<{ name: string; percentage: number; recyclable: boolean }>;
  recyclingInstructions: string;
  carbonFootprint?: string;
}

export interface Product {
  gtin: string;
  brand_id: string;
  product_name: string;
  material_passport: MaterialPassport;
  category: string | null;
  weight_grams: number | null;
  created_at: string;
  stats: ProductStats;
}

export interface ProductInstance {
  id: string;
  gtin: string;
  identification_type: 'BATCH' | 'UNIQUE';
  batch_number: string | null;
  serial_number: string | null;
  current_status: string;
  last_updated: string;
}

export interface ProductDetail {
  product: Omit<Product, 'stats'>;
  instances: ProductInstance[];
  stats: ProductStats;
}

export interface InstanceCreateResult {
  instance: ProductInstance;
  gs1Url: string;
  qrDataUrl: string;
}

export interface CreateProductPayload {
  gtin: string;
  product_name: string;
  category?: string;
  weight_grams?: number;
  material_passport?: Partial<MaterialPassport>;
}

// --- Functions ---

export const getProducts = async (): Promise<Product[]> => {
  const response = await fetch(`${API_URL}/products`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat daftar produk');
  }
  return data.data;
};

export const getProductDetail = async (gtin: string): Promise<ProductDetail> => {
  const response = await fetch(`${API_URL}/products/${gtin}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal memuat detail produk');
  }
  return data.data;
};

export const createProduct = async (payload: CreateProductPayload): Promise<Product> => {
  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal membuat produk');
  }
  return data.data;
};

export const createInstance = async (
  gtin: string,
  payload: {
    identification_type: 'BATCH' | 'UNIQUE';
    batch_number?: string;
    serial_number?: string;
  }
): Promise<InstanceCreateResult> => {
  const response = await fetch(`${API_URL}/products/${gtin}/instances`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal membuat instance');
  }
  return data.data;
};

export const getInstanceQR = async (
  instanceId: string
): Promise<{ gs1Url: string; qrDataUrl: string }> => {
  const response = await fetch(`${API_URL}/products/instances/${instanceId}/qr`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Gagal generate QR');
  }
  return data.data;
};
