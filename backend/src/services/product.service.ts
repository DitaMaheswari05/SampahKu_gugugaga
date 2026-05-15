import { supabase } from '../config/supabase';
import QRCode from 'qrcode';
import { OpenFoodFactsService } from './openfoodfacts.service';

const GS1_BASE_URL = 'https://sampahku.id';

export class ProductService {
  /**
   * Create a new product in the catalogue.
   * Validates that GTIN prefix is owned by the brand via brand_gtin_prefixes table.
   */
  static async createProduct(brandId: string, payload: {
    sku: string;
    product_name: string;
    material_passport?: any;
    category?: string;
    weight_grams?: number;
  }) {
    const { sku, product_name, material_passport, category, weight_grams } = payload;

    // Verify brand exists
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', brandId)
      .single();

    if (profErr || !profile) throw new Error('Brand profile not found');

    // Get active GTIN prefixes for this brand
    const { data: prefixes, error: prefErr } = await supabase
      .from('brand_gtin_prefixes')
      .select('prefix')
      .eq('brand_id', brandId)
      .eq('is_active', true);

    if (prefErr) throw prefErr;
    if (!prefixes || prefixes.length === 0) {
      throw new Error('Brand ini belum memiliki prefix GTIN aktif. Hubungi admin untuk registrasi prefix.');
    }

    // Pick random prefix and generate GTIN
    const selectedPrefix = prefixes[Math.floor(Math.random() * prefixes.length)].prefix;
    const itemRef = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 digit
    const gtin = `${selectedPrefix}${itemRef}`;

    const { data, error } = await supabase
      .from('products')
      .insert([{
        gtin,
        sku,
        brand_id: brandId,
        product_name,
        material_passport: material_passport || {},
        category: category || null,
        weight_grams: weight_grams || null,
        source: 'BRAND_MANUAL',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a product instance (BATCH or UNIQUE) and record a commissioning activity.
   * Returns the instance data along with a QR code (data URL) following GS1 Digital Link.
   */
  static async createInstance(gtin: string, brandId: string, payload: {
    identification_type: 'BATCH' | 'UNIQUE';
    identity_number?: number;
    batch_number?: string;
    serial_number?: string;
    quantity?: number; // Only for BATCH: how many physical instances this QR represents
  }) {
    const { identification_type, quantity = 1 } = payload;
    const parsedIdentity = payload.identity_number
      ?? Number(String(identification_type === 'BATCH' ? payload.batch_number : payload.serial_number).replace(/\D/g, ''));

    if (!Number.isInteger(parsedIdentity) || parsedIdentity <= 0) {
      throw new Error('identity_number must be a positive number');
    }

    const batch_number = identification_type === 'BATCH' ? `BATCH-${parsedIdentity}` : null;
    const serial_number = identification_type === 'UNIQUE' ? `SERIAL-${parsedIdentity}` : null;

    // Verify the product belongs to this brand
    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('id, gtin, brand_id')
      .eq('gtin', gtin)
      .single();

    if (pErr || !product) throw new Error('Product not found');
    if (product.brand_id !== brandId) throw new Error('You do not own this product');

    // Build GS1 Digital Link URL
    let gs1Url: string;
    if (identification_type === 'UNIQUE') {
      gs1Url = `${GS1_BASE_URL}/01/${gtin}/21/${serial_number}`;
    } else {
      gs1Url = `${GS1_BASE_URL}/01/${gtin}/10/${batch_number}`;
    }

    const effectiveQty = identification_type === 'BATCH' ? Math.max(1, Math.min(quantity, 10000)) : 1;
    const now = new Date().toISOString();

    // Insert instances (1 for UNIQUE, quantity for BATCH)
    const instanceRows = Array.from({ length: effectiveQty }, () => ({
      product_id: product.id,
      identification_type,
      batch_number: batch_number || null,
      serial_number: serial_number || null,
      identity_number: parsedIdentity,
      current_status: 'IN_MARKET',
      last_updated: now,
    }));

    const { data: instances, error: iErr } = await supabase
      .from('product_instances')
      .insert(instanceRows)
      .select();

    if (iErr || !instances || instances.length === 0) throw iErr || new Error('Failed to create instances');

    const instance = instances[0]; // primary instance (used for QR)

    // Record commissioning activity for every physical item so batch timelines
    // show the full quantity that was created at market entry.
    const commissioningActivities = instances.map((row: any) => ({
      instance_id: row.id,
      actor_id: brandId,
      event_type: 'ObjectEvent',
      biz_step: 'commissioning',
      location_name: null,
      facility_type: null,
      coordinates: null,
      epcis_body: {
        '@context': ['https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld'],
        type: 'EPCISDocument',
        schemaVersion: '2.0',
        epcisBody: {
          eventList: [{
            type: 'ObjectEvent',
            eventTime: now,
            eventTimeZoneOffset: '+07:00',
            epcList: [gs1Url],
            action: 'ADD',
            bizStep: 'urn:epcglobal:cbv:bizstep:commissioning',
          }],
        },
      },
      timestamp: now,
    }));

    await supabase.from('activities').insert(commissioningActivities);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(gs1Url, {
      width: 400,
      margin: 2,
      color: { dark: '#1B2A1B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });

    return { instance, instances, gs1Url, qrDataUrl, quantity: effectiveQty };
  }

  /**
   * List all products belonging to a brand, with aggregated instance statistics.
   */
  static async getProductsByBrand(brandId: string) {
    // Fetch products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!products || products.length === 0) return [];

    // Build id→gtin map for stat attribution
    const productIdToGtin: Record<string, string> = {};
    products.forEach((p: any) => { productIdToGtin[p.id] = p.gtin; });
    const productIds = products.map((p: any) => p.id);

    // Filter directly by product_id — avoids unreliable nested-join filtering in PostgREST
    const { data: instances, error: iErr } = await supabase
      .from('product_instances')
      .select('current_status, product_id')
      .in('product_id', productIds);

    if (iErr) throw iErr;

    // Build stats map keyed by gtin
    const statsMap: Record<string, {
      total: number;
      recycled: number;
      disposed: number;
      in_market: number;
      in_progress: number;
    }> = {};

    for (const inst of (instances || [])) {
      const pGtin = productIdToGtin[(inst as any).product_id];
      if (!pGtin) continue;
      if (!statsMap[pGtin]) {
        statsMap[pGtin] = { total: 0, recycled: 0, disposed: 0, in_market: 0, in_progress: 0 };
      }
      const s = statsMap[pGtin];
      s.total++;
      if (inst.current_status === 'RECYCLED') s.recycled++;
      else if (inst.current_status === 'DISPOSED') s.disposed++;
      else if (inst.current_status === 'IN_MARKET') s.in_market++;
      else s.in_progress++;
    }

    return products.map((p: any) => ({
      ...p,
      stats: statsMap[p.gtin] || { total: 0, recycled: 0, disposed: 0, in_market: 0, in_progress: 0 },
    }));
  }

  /**
   * Get detailed product info with all instances.
   */
  static async getProductDetail(gtin: string) {
    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('*')
      .eq('gtin', gtin)
      .single();

    if (pErr) throw pErr;

    // Filter directly by product_id — avoids unreliable nested-join filtering
    const { data: instances, error: iErr } = await supabase
      .from('product_instances')
      .select('*')
      .eq('product_id', product.id)
      .order('last_updated', { ascending: false });

    if (iErr) throw iErr;

    // Aggregate stats
    const stats = { total: 0, recycled: 0, disposed: 0, in_market: 0, in_progress: 0 };
    for (const inst of (instances || [])) {
      stats.total++;
      if (inst.current_status === 'RECYCLED') stats.recycled++;
      else if (inst.current_status === 'DISPOSED') stats.disposed++;
      else if (inst.current_status === 'IN_MARKET') stats.in_market++;
      else stats.in_progress++;
    }

    // Attach gtin from the already-fetched product row
    const mappedInstances = (instances || []).map((inst: any) => ({
      ...inst,
      gtin: product.gtin,
    }));

    return { product, instances: mappedInstances, stats };
  }

  /**
   * Generate QR code for an existing instance.
   */
  static async getInstanceQR(instanceId: string) {
    const { data: instance, error } = await supabase
      .from('product_instances')
      .select('*, products(gtin)')
      .eq('id', instanceId)
      .single();

    if (error || !instance) throw new Error('Instance not found');

    let gs1Url: string;
    const gtin = (instance.products as any)?.gtin;
    if (instance.identification_type === 'UNIQUE') {
      gs1Url = `${GS1_BASE_URL}/01/${gtin}/21/${instance.serial_number}`;
    } else {
      gs1Url = `${GS1_BASE_URL}/01/${gtin}/10/${instance.batch_number}`;
    }

    const qrDataUrl = await QRCode.toDataURL(gs1Url, {
      width: 400,
      margin: 2,
      color: { dark: '#1B2A1B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });

    return { 
      gs1Url, 
      qrDataUrl, 
      instance: { ...instance, gtin } 
    };
  }

  /**
   * Resolve GS1 Digital Link into an instance ID.
   */
  static async resolveGS1(gtin: string, identification_type: 'BATCH' | 'UNIQUE', identifier: string) {
    const column = identification_type === 'BATCH' ? 'batch_number' : 'serial_number';

    // Step 1: resolve GTIN → product
    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('id, gtin, product_name, category, brand_id')
      .eq('gtin', gtin)
      .single();

    if (pErr || !product) {
      throw new Error('Product not found for given GTIN.');
    }

    let brandProfile: { name: string } | null = null;
    if (product.brand_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', product.brand_id)
        .single();

      if (profile) {
        brandProfile = { name: profile.name };
      }
    }

    // Step 2: find instance by product_id + batch/serial number.
    // BATCH QRs have MULTIPLE sibling rows — use limit(1) instead of single().
    const { data: instances, error } = await supabase
      .from('product_instances')
      .select('id, current_status')
      .eq('product_id', product.id)
      .eq(column, identifier)
      .limit(1);

    if (error || !instances || instances.length === 0) {
      throw new Error('Product instance not found from the given GS1 Digital Link details.');
    }

    return {
      ...instances[0],
      gtin: product.gtin,
      products: {
        ...product,
        profiles: brandProfile,
      },
    };
  }

  /**
   * Resolve or create a product from a barcode GTIN.
   * - If product already exists in DB, return it
   * - If not, try to fetch from Open Food Facts
   * - If OFF unavailable, create a placeholder product (source='OFF_AUTO')
   * Returns the resolved/created product
   */
  static async resolveOrCreateFromBarcode(gtin: string) {
    const cleanGtin = (gtin || '').replace(/[^0-9]/g, '');
    if (!cleanGtin || ![8, 12, 13, 14].includes(cleanGtin.length)) {
      throw new Error('GTIN format invalid');
    }

    // Step 1: Check if product already exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('*')
      .eq('gtin', cleanGtin)
      .single();

    if (existingProduct) {
      return existingProduct;
    }

    // Step 2: Try to fetch from Open Food Facts
    const offData = await OpenFoodFactsService.fetchProductByGtin(cleanGtin);

    if (offData) {
      // Create product from OFF data
      const materialPassport = OpenFoodFactsService.mapToMaterialPassport(offData);
      const categoryName = (offData.categories_tags && offData.categories_tags[0]) || 'Unknown';

      const { data: newProduct, error: insertErr } = await supabase
        .from('products')
        .insert([{
          gtin: cleanGtin,
          sku: null,
          brand_id: null, // OFF products have no brand ownership
          product_name: offData.product_name || 'Unknown Product',
          material_passport: materialPassport,
          category: categoryName,
          weight_grams: null,
          source: 'OFF_AUTO',
          off_last_synced_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;
      return newProduct;
    }

    // Step 3: Fallback - create placeholder product
    const materialPassport = OpenFoodFactsService.getDefaultMaterialPassport(cleanGtin);

    const { data: fallbackProduct, error: fallbackErr } = await supabase
      .from('products')
      .insert([{
        gtin: cleanGtin,
        sku: null,
        brand_id: null,
        product_name: 'Unknown Product',
        material_passport: materialPassport,
        category: 'Unknown',
        weight_grams: null,
        source: 'OFF_AUTO',
        off_last_synced_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (fallbackErr) throw fallbackErr;
    return fallbackProduct;
  }
}
