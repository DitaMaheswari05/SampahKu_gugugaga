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
   * - Untuk UNIQUE: return activities instance itu saja.
   * - Untuk BATCH: cari semua sibling instances (sama product_id + batch_number),
   *   gabungkan semua activities mereka, dan hitung status_counts per current_status.
   *
   * NOTE: 3-level nested join (instances→products→profiles) tidak reliable di PostgREST.
   * Pakai 2-step: ambil brand_id dari products, lalu fetch profile terpisah.
   */
  static async getInstanceActivities(instanceId: string) {
    // Step 1: instance + product info (with brand_id, tanpa nested profiles join)
    const { data: instanceData, error: instErr } = await supabase
      .from('product_instances')
      .select(`
        id,
        product_id,
        current_status,
        identification_type,
        batch_number,
        serial_number,
        last_updated,
        products!inner (
          id,
          gtin,
          product_name,
          category,
          weight_grams,
          brand_id
        )
      `)
      .eq('id', instanceId)
      .single();

    if (instErr) throw instErr;

    const inst = instanceData as any;
    const isBatch = inst.identification_type === 'BATCH';

    // Step 2: fetch brand profile name separately
    let brandProfile: { name: string } | null = null;
    if (inst.products?.brand_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', inst.products.brand_id)
        .single();
      if (profile) brandProfile = { name: profile.name };
    }

    const baseResult = {
      ...inst,
      gtin: inst.products?.gtin,
      products: {
        ...inst.products,
        profiles: brandProfile,
      },
    };

    if (!isBatch) {
      // UNIQUE: single-instance activities only
      const { data: activities, error: actErr } = await supabase
        .from('activities')
        .select(`
          id,
          instance_id,
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

      return {
        instance: baseResult,
        activities: activities ?? [],
        status_counts: null,
        sibling_count: 1,
      };
    }

    // BATCH: fetch all sibling instances sharing product_id + batch_number
    const { data: siblings, error: sibErr } = await supabase
      .from('product_instances')
      .select('id, current_status')
      .eq('product_id', inst.product_id)
      .eq('batch_number', inst.batch_number)
      .eq('identification_type', 'BATCH');

    if (sibErr) throw sibErr;

    const siblingIds = (siblings ?? []).map((s: any) => s.id);

    // Aggregate status counts
    const status_counts: Record<string, number> = {};
    for (const s of (siblings ?? [])) {
      status_counts[s.current_status] = (status_counts[s.current_status] || 0) + 1;
    }

    // Fetch all activities for all sibling instances
    const { data: allActivities, error: actErr } = await supabase
      .from('activities')
      .select(`
        id,
        instance_id,
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
      .in('instance_id', siblingIds.length > 0 ? siblingIds : [instanceId])
      .order('timestamp', { ascending: true });

    if (actErr) throw actErr;

    return {
      instance: baseResult,
      activities: allActivities ?? [],
      status_counts,
      sibling_count: siblingIds.length,
    };
  }
}
