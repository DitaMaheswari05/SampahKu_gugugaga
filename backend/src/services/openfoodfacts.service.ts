import axios, { AxiosError } from 'axios';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2';
const OFF_TIMEOUT = 5000; // 5 second timeout

export interface OFFProductData {
  code: string; // GTIN
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories_tags?: string[];
  packaging?: any;
  nutriscore_grade?: string;
  image_url?: string;
}

/**
 * Open Food Facts integration service.
 * Fetches product metadata from OFF API to resolve unregistered GTINs.
 */
export class OpenFoodFactsService {
  /**
   * Fetch product from Open Food Facts by GTIN/EAN.
   * Returns product metadata or null if not found.
   * Throws error only on network/timeout issues.
   */
  static async fetchProductByGtin(gtin: string): Promise<OFFProductData | null> {
    if (!gtin || typeof gtin !== 'string') {
      return null;
    }

    const cleanGtin = gtin.replace(/[^0-9]/g, '');
    if (!cleanGtin || ![8, 12, 13, 14].includes(cleanGtin.length)) {
      return null;
    }

    try {
      const response = await axios.get(
        `${OFF_API_BASE}/product/${cleanGtin}`,
        {
          timeout: OFF_TIMEOUT,
          headers: {
            'User-Agent': 'SampahKu/1.0 (+https://sampahku.id)',
          },
        }
      );

      const { product } = response.data;

      if (!product || !product.code) {
        return null;
      }

      // OFF stores names in localized fields — try all candidates
      const productName = product.product_name
        || product.product_name_id   // Indonesian name
        || product.product_name_en   // English name
        || product.abbreviated_product_name
        || product.generic_name
        || product.generic_name_id
        || product.generic_name_en
        || undefined;

      const genericName = product.generic_name
        || product.generic_name_id
        || product.generic_name_en
        || undefined;

      const brands = product.brands || undefined;

      // Compose a meaningful display name if the bare product_name is empty
      let displayName = productName;
      if (!displayName && brands) {
        displayName = brands;
      }

      return {
        code: product.code,
        product_name: displayName,
        generic_name: genericName,
        brands,
        categories_tags: product.categories_tags || [],
        packaging: product.packaging || null,
        nutriscore_grade: product.nutriscore_grade || undefined,
        image_url: product.image_url || product.image_front_url || product.image_front_small_url || undefined,
      };
    } catch (error) {
      const axErr = error as AxiosError;
      
      // 404 = product not found, this is OK (return null)
      if (axErr.response?.status === 404) {
        return null;
      }

      // For any other error, log and return null (don't throw)
      console.warn(`[OFF] Fetch failed for GTIN ${gtin}:`, axErr.message);
      return null;
    }
  }

  /**
   * Map OFF product data to our internal material_passport format.
   */
  static mapToMaterialPassport(offData: OFFProductData): any {
    return {
      off_code: offData.code,
      product_name: offData.product_name || 'Unknown Product',
      generic_name: offData.generic_name || null,
      brands: offData.brands || null,
      categories: offData.categories_tags || [],
      packaging_info: offData.packaging || {},
      nutriscore_grade: offData.nutriscore_grade || null,
      image_url: offData.image_url || null,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Get default material_passport for fallback product when OFF unavailable.
   */
  static getDefaultMaterialPassport(gtin: string): any {
    return {
      off_code: gtin,
      product_name: 'Unknown Product',
      generic_name: null,
      categories: [],
      packaging_info: {},
      nutriscore_grade: null,
      image_url: null,
      synced_at: new Date().toISOString(),
    };
  }
}
