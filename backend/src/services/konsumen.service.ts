import { supabase } from '../config/supabase';

export class KonsumenService {
  /**
   * Ambil semua product items yang pernah di-discard oleh konsumen tertentu (Tier 1 + Tier 2).
   * - Tier 1: activities dengan instance_id (personal timeline)
   * - Tier 2: activities dengan gtin (barcode scan)
   */
  static async getMyCollections(userId: string) {
    // Tier 1: product instances (UNIQUE/BATCH)
    const { data: tier1Data, error: tier1Err } = await supabase
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
      .not('instance_id', 'is', null)
      .order('timestamp', { ascending: false });

    if (tier1Err) throw tier1Err;

    // Normalize Tier 1
    const tier1Collections = (tier1Data ?? []).map((row: any) => ({
      type: 'TIER_1',
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

    // Tier 2: barcode scans (no instance_id). Fetch products separately because
    // activities.gtin is intentionally denormalized and has no FK relationship.
    const { data: tier2Data, error: tier2Err } = await supabase
      .from('activities')
      .select(`
        id,
        timestamp,
        gtin
      `)
      .eq('actor_id', userId)
      .eq('biz_step', 'discarding')
      .is('instance_id', null)
      .not('gtin', 'is', null)
      .order('timestamp', { ascending: false });

    if (tier2Err) throw tier2Err;

    const tier2Gtins = Array.from(new Set((tier2Data ?? []).map((row: any) => row.gtin).filter(Boolean)));
    let productsByGtin: Record<string, any> = {};

    if (tier2Gtins.length > 0) {
      const { data: tier2Products, error: productsErr } = await supabase
        .from('products')
        .select('gtin, product_name, category')
        .in('gtin', tier2Gtins);

      if (productsErr) throw productsErr;
      productsByGtin = Object.fromEntries((tier2Products ?? []).map((p: any) => [p.gtin, p]));
    }

    // Normalize Tier 2
    const tier2Collections = (tier2Data ?? []).map((row: any) => ({
      type: 'TIER_2',
      activity_id: row.id,
      collected_at: row.timestamp,
      gtin: row.gtin,
      product_name: productsByGtin[row.gtin]?.product_name || 'Unknown Product',
      category: productsByGtin[row.gtin]?.category || 'Unknown',
    }));

    // Merge and sort by collected_at descending
    const allCollections = [...tier1Collections, ...tier2Collections].sort(
      (a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
    );

    return allCollections;
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

  /**
   * Ambil statistik agregat untuk Tier 2 GTIN.
   * Return jumlah scan events per biz_step dari tabel sku_aggregates.
   */
  static async getGtinAggregateStats(gtin: string) {
    const { data: aggregates, error } = await supabase
      .from('sku_aggregates')
      .select('biz_step, count, last_scanned_at')
      .eq('gtin', gtin)
      .order('biz_step', { ascending: true });

    if (error) throw error;

    // Build stats map. Sum rows defensively because NULL tps_id can produce
    // more than one aggregate row in PostgreSQL unique constraints.
    const statsMap: Record<string, { count: number; last_scanned_at: string }> = {};
    for (const agg of (aggregates ?? [])) {
      const existing = statsMap[agg.biz_step];
      statsMap[agg.biz_step] = {
        count: (existing?.count || 0) + agg.count,
        last_scanned_at: !existing || new Date(agg.last_scanned_at) > new Date(existing.last_scanned_at)
          ? agg.last_scanned_at
          : existing.last_scanned_at,
      };
    }

    return statsMap;
  }

  /**
   * Ambil recent activities untuk Tier 2 GTIN (opsional untuk menampilkan aktivitas terakhir).
   */
  static async getGtinRecentActivities(gtin: string, limit: number = 5) {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        timestamp,
        biz_step,
        location_name,
        facility_type,
        tps_id,
        tps_facilities (
          name
        ),
        profiles (
          name,
          role
        )
      `)
      .eq('gtin', gtin)
      .is('instance_id', null)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      activity_id: row.id,
      timestamp: row.timestamp,
      biz_step: row.biz_step,
      location_name: row.location_name,
      facility_type: row.facility_type,
      tps_name: row.tps_facilities?.name || null,
      actor_name: row.profiles?.name || 'Unknown',
      actor_role: row.profiles?.role || null,
    }));
  }
}
