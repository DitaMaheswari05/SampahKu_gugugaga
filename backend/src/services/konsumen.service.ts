import { supabase } from '../config/supabase';

export class KonsumenService {
  /**
   * Ambil semua product instances yang pernah di-discard oleh konsumen tertentu.
   * Data diambil dari tabel activities (biz_step = 'discarding') join ke product_instances dan products.
   */
  static async getMyCollections(userId: string) {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        timestamp,
        instance_id,
        product_instances!inner (
          id,
          current_status,
          identification_type,
          batch_number,
          serial_number,
          last_updated,
          products!inner (
            gtin,
            product_name,
            category,
            weight_grams
          )
        )
      `)
      .eq('actor_id', userId)
      .eq('biz_step', 'discarding')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Normalisasi ke flat structure agar mudah dikonsumsi frontend
    return (data ?? []).map((row: any) => ({
      activity_id: row.id,
      collected_at: row.timestamp,
      instance_id: row.instance_id,
      gtin: row.product_instances.products.gtin,
      current_status: row.product_instances.current_status,
      identification_type: row.product_instances.identification_type,
      batch_number: row.product_instances.batch_number,
      serial_number: row.product_instances.serial_number,
      last_updated: row.product_instances.last_updated,
      product_name: row.product_instances.products.product_name,
      category: row.product_instances.products.category,
      weight_grams: row.product_instances.products.weight_grams,
    }));
  }

  /**
   * Ambil timeline aktivitas untuk satu product instance.
   * Diurutkan dari terlama ke terbaru agar timeline tampil kronologis.
   */
  static async getInstanceActivities(instanceId: string) {
    const { data: instanceData, error: instErr } = await supabase
      .from('product_instances')
      .select(`
        id,
        current_status,
        identification_type,
        batch_number,
        serial_number,
        last_updated,
        products!inner (
          gtin,
          product_name,
          category,
          weight_grams,
          profiles!inner (
            name
          )
        )
      `)
      .eq('id', instanceId)
      .single();

    if (instErr) throw instErr;

    const { data: activities, error: actErr } = await supabase
      .from('activities')
      .select(`
        id,
        biz_step,
        location_name,
        facility_type,
        timestamp,
        evidence_url,
        epcis_body,
        blockchain_hash,
        profiles!inner (
          name,
          role
        )
      `)
      .eq('instance_id', instanceId)
      .order('timestamp', { ascending: true });

    if (actErr) throw actErr;

    const result = {
      ...instanceData,
      gtin: (instanceData as any).products?.gtin,
    };

    return {
      instance: result,
      activities: activities ?? [],
    };
  }
}
