import { supabase } from '../config/supabase';
import QRCode from 'qrcode';

const GS1_BASE_URL = 'https://sampahku.id';

export class ProductService {
  /**
   * Create a new product in the catalogue.
   */
  static async createProduct(brandId: string, payload: {
    gtin: string;
    product_name: string;
    material_passport?: any;
    category?: string;
    weight_grams?: number;
  }) {
    const { gtin, product_name, material_passport, category, weight_grams } = payload;

    const { data, error } = await supabase
      .from('products')
      .insert([{
        gtin,
        brand_id: brandId,
        product_name,
        material_passport: material_passport || {},
        category: category || null,
        weight_grams: weight_grams || null,
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
    batch_number?: string;
    serial_number?: string;
  }) {
    const { identification_type, batch_number, serial_number } = payload;

    // Verify the product belongs to this brand
    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('gtin, brand_id')
      .eq('gtin', gtin)
      .single();

    if (pErr || !product) throw new Error('Product not found');
    if (product.brand_id !== brandId) throw new Error('You do not own this product');

    // Build GS1 Digital Link URL
    let gs1Url: string;
    if (identification_type === 'UNIQUE') {
      if (!serial_number) throw new Error('serial_number required for UNIQUE type');
      gs1Url = `${GS1_BASE_URL}/01/${gtin}/21/${serial_number}`;
    } else {
      if (!batch_number) throw new Error('batch_number required for BATCH type');
      gs1Url = `${GS1_BASE_URL}/01/${gtin}/10/${batch_number}`;
    }

    // Insert instance
    const { data: instance, error: iErr } = await supabase
      .from('product_instances')
      .insert([{
        gtin,
        identification_type,
        batch_number: batch_number || null,
        serial_number: serial_number || null,
        current_status: 'IN_MARKET',
        last_updated: new Date().toISOString(),
      }])
      .select()
      .single();

    if (iErr) throw iErr;

    // Record commissioning activity
    await supabase.from('activities').insert([{
      instance_id: instance.id,
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
            eventTime: new Date().toISOString(),
            eventTimeZoneOffset: '+07:00',
            epcList: [gs1Url],
            action: 'ADD',
            bizStep: 'urn:epcglobal:cbv:bizstep:commissioning',
          }],
        },
      },
      timestamp: new Date().toISOString(),
    }]);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(gs1Url, {
      width: 400,
      margin: 2,
      color: { dark: '#1B2A1B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });

    return { instance, gs1Url, qrDataUrl };
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

    // For each product, aggregate instance stats
    const gtins = products.map((p: any) => p.gtin);

    const { data: instances, error: iErr } = await supabase
      .from('product_instances')
      .select('gtin, current_status, identification_type')
      .in('gtin', gtins);

    if (iErr) throw iErr;

    // Build stats map
    const statsMap: Record<string, {
      total: number;
      recycled: number;
      disposed: number;
      in_market: number;
      in_progress: number;
    }> = {};

    for (const inst of (instances || [])) {
      if (!statsMap[inst.gtin]) {
        statsMap[inst.gtin] = { total: 0, recycled: 0, disposed: 0, in_market: 0, in_progress: 0 };
      }
      const s = statsMap[inst.gtin];
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

    const { data: instances, error: iErr } = await supabase
      .from('product_instances')
      .select('*')
      .eq('gtin', gtin)
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

    return { product, instances: instances || [], stats };
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
    if (instance.identification_type === 'UNIQUE') {
      gs1Url = `${GS1_BASE_URL}/01/${instance.gtin}/21/${instance.serial_number}`;
    } else {
      gs1Url = `${GS1_BASE_URL}/01/${instance.gtin}/10/${instance.batch_number}`;
    }

    const qrDataUrl = await QRCode.toDataURL(gs1Url, {
      width: 400,
      margin: 2,
      color: { dark: '#1B2A1B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });

    return { gs1Url, qrDataUrl, instance };
  }

  /**
   * Resolve GS1 Digital Link into an instance ID.
   */
  static async resolveGS1(gtin: string, identification_type: 'BATCH' | 'UNIQUE', identifier: string) {
    const column = identification_type === 'BATCH' ? 'batch_number' : 'serial_number';
    
    const { data: instance, error } = await supabase
      .from('product_instances')
      .select('id, current_status, gtin, products(product_name, category)')
      .eq('gtin', gtin)
      .eq(column, identifier)
      .single();

    if (error || !instance) {
      throw new Error('Product instance not found from the given GS1 Digital Link details.');
    }

    return instance;
  }
}
