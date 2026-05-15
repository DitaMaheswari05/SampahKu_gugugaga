import { supabase } from '../config/supabase';
import { AuthService } from './auth.service';

const DEFAULT_ITEM_WEIGHT_GRAMS = 50;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function addCount(map: Record<string, number>, key: string | null | undefined, count: number) {
  const safeKey = key || 'Tidak diketahui';
  map[safeKey] = (map[safeKey] || 0) + count;
}

function formatTonFromGrams(grams: number) {
  const tons = grams / 1_000_000;
  if (tons >= 10) return `${Math.round(tons).toLocaleString('id-ID')} Ton`;
  if (tons >= 1) return `${tons.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ton`;
  return `${Math.round(grams / 1000).toLocaleString('id-ID')} Kg`;
}

function mapToDistribution(counts: Record<string, number>) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({
      label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export class TpsService {
  /**
   * Register a new TPS facility (called by ADMIN_TPS).
   * Enforces 1 admin : 1 TPS constraint.
   */
  static async registerTps(adminId: string, data: {
    name: string;
    type: string;
    address: string;
    city: string;
    province: string;
    coordinates: { type: string; coordinates: number[] };
    radius_m?: number;
    capacity_tons_per_day?: number;
    allowed_actions: string[];
  }) {
    // Check if admin already has a TPS
    const { data: existing, error: checkErr } = await supabase
      .from('tps_facilities')
      .select('id')
      .eq('admin_id', adminId)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) throw new Error('Anda sudah memiliki TPS terdaftar. 1 admin hanya bisa mengelola 1 TPS.');

    const { data: tps, error } = await supabase
      .from('tps_facilities')
      .insert([{
        name: data.name,
        type: data.type,
        address: data.address,
        city: data.city,
        province: data.province,
        coordinates: data.coordinates,
        radius_m: data.radius_m || 200,
        capacity_tons_per_day: data.capacity_tons_per_day || 0,
        allowed_actions: data.allowed_actions,
        admin_id: adminId,
      }])
      .select()
      .single();

    if (error) throw error;
    return tps;
  }

  /**
   * Get the TPS managed by this admin.
   */
  static async getMyTps(adminId: string) {
    const { data, error } = await supabase
      .from('tps_facilities')
      .select('*')
      .eq('admin_id', adminId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Dashboard analytics for the TPS managed by the current admin.
   * Combines Tier 1 scan activities and Tier 2 aggregate barcode scans.
   */
  static async getMyTpsDashboard(adminId: string) {
    const tps = await this.getMyTps(adminId);
    if (!tps) return null;

    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(daysAgo(1));
    const weekStart = daysAgo(7);
    const prevWeekStart = daysAgo(14);
    const monthStart = daysAgo(30);
    const prevMonthStart = daysAgo(60);

    const { data: activities, error: actErr } = await supabase
      .from('activities')
      .select(`
        id,
        instance_id,
        gtin,
        biz_step,
        timestamp,
        product_instances (
          products (
            gtin,
            product_name,
            category,
            weight_grams
          )
        )
      `)
      .eq('tps_id', tps.id);

    if (actErr) throw actErr;

    const { data: aggregates, error: aggErr } = await supabase
      .from('sku_aggregates')
      .select(`
        gtin,
        biz_step,
        count,
        products (
          gtin,
          product_name,
          category,
          weight_grams
        )
      `)
      .eq('tps_id', tps.id);

    if (aggErr) throw aggErr;

    const activityRows = activities ?? [];
    const aggregateRows = aggregates ?? [];

    const tier1Activities = activityRows.filter((row: any) => row.instance_id);
    const totalCount = tier1Activities.length + aggregateRows.reduce((sum: number, row: any) => sum + (row.count || 0), 0);

    const todayCount = activityRows.filter((row: any) => new Date(row.timestamp) >= todayStart).length;
    const yesterdayCount = activityRows.filter((row: any) => {
      const ts = new Date(row.timestamp);
      return ts >= yesterdayStart && ts < todayStart;
    }).length;
    const weekCount = activityRows.filter((row: any) => new Date(row.timestamp) >= weekStart).length;
    const prevWeekCount = activityRows.filter((row: any) => {
      const ts = new Date(row.timestamp);
      return ts >= prevWeekStart && ts < weekStart;
    }).length;
    const monthCount = activityRows.filter((row: any) => new Date(row.timestamp) >= monthStart).length;
    const prevMonthCount = activityRows.filter((row: any) => {
      const ts = new Date(row.timestamp);
      return ts >= prevMonthStart && ts < monthStart;
    }).length;

    const stageCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const productMap = new Map<string, {
      gtin: string;
      name: string;
      count: number;
      recentCount: number;
      previousCount: number;
    }>();
    let weightGrams = 0;

    for (const row of tier1Activities as any[]) {
      const product = row.product_instances?.products;
      const gtin = product?.gtin || row.gtin || 'unknown';
      const name = product?.product_name || 'Unknown Product';
      const weight = product?.weight_grams || DEFAULT_ITEM_WEIGHT_GRAMS;
      const category = product?.category || 'Tidak diketahui';
      const ts = new Date(row.timestamp);

      addCount(stageCounts, row.biz_step, 1);
      addCount(categoryCounts, category, 1);
      weightGrams += weight;

      const item = productMap.get(gtin) || { gtin, name, count: 0, recentCount: 0, previousCount: 0 };
      item.count += 1;
      if (ts >= monthStart) item.recentCount += 1;
      if (ts >= prevMonthStart && ts < monthStart) item.previousCount += 1;
      productMap.set(gtin, item);
    }

    for (const row of aggregateRows as any[]) {
      const product = row.products;
      const gtin = product?.gtin || row.gtin || 'unknown';
      const name = product?.product_name || 'Unknown Product';
      const count = row.count || 0;
      const weight = product?.weight_grams || DEFAULT_ITEM_WEIGHT_GRAMS;
      const category = product?.category || 'Tidak diketahui';

      addCount(stageCounts, row.biz_step, count);
      addCount(categoryCounts, category, count);
      weightGrams += weight * count;

      const item = productMap.get(gtin) || { gtin, name, count: 0, recentCount: 0, previousCount: 0 };
      item.count += count;
      item.recentCount += count;
      productMap.set(gtin, item);
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, index) => ({
        rank: index + 1,
        name: item.name,
        gtin: item.gtin,
        total: item.count,
        trend: pctChange(item.recentCount, item.previousCount),
      }));

    return {
      tps,
      stats: {
        volume_label: formatTonFromGrams(weightGrams),
        volume_grams: Math.round(weightGrams),
        total_waste: totalCount,
        today: todayCount,
        this_week: weekCount,
        trends: {
          total_month: pctChange(monthCount, prevMonthCount),
          today: pctChange(todayCount, yesterdayCount),
          this_week: pctChange(weekCount, prevWeekCount),
        },
      },
      stages: mapToDistribution(stageCounts),
      categories: mapToDistribution(categoryCounts),
      top_products: topProducts,
    };
  }

  /**
   * Create a petugas account bound to a TPS.
   * Only callable by the TPS admin.
   */
  static async createPetugas(adminId: string, tpsId: string, petugasData: {
    name: string;
    email: string;
    password: string;
  }) {
    // Verify this admin owns this TPS
    const { data: tps, error: tpsErr } = await supabase
      .from('tps_facilities')
      .select('id')
      .eq('id', tpsId)
      .eq('admin_id', adminId)
      .maybeSingle();

    if (tpsErr) throw tpsErr;
    if (!tps) throw new Error('TPS tidak ditemukan atau Anda bukan admin TPS ini.');

    // Register user with role PETUGAS
    const result = await AuthService.register(
      petugasData.email,
      petugasData.password,
      petugasData.name,
      'PETUGAS'
    );

    const userId = result?.user?.id;
    if (!userId) throw new Error('Gagal membuat akun petugas.');

    // Link petugas to TPS
    const { error: linkErr } = await supabase
      .from('profiles')
      .update({ tps_id: tpsId })
      .eq('id', userId);

    if (linkErr) throw linkErr;

    return { id: userId, name: petugasData.name, email: petugasData.email };
  }

  /**
   * List all petugas belonging to a TPS.
   */
  static async getTpsPetugas(adminId: string, tpsId: string) {
    // Verify ownership
    const { data: tps, error: tpsErr } = await supabase
      .from('tps_facilities')
      .select('id')
      .eq('id', tpsId)
      .eq('admin_id', adminId)
      .maybeSingle();

    if (tpsErr) throw tpsErr;
    if (!tps) throw new Error('TPS tidak ditemukan atau Anda bukan admin TPS ini.');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, created_at')
      .eq('tps_id', tpsId)
      .eq('role', 'PETUGAS');

    if (error) throw error;
    return data || [];
  }

  /**
   * Remove a petugas account from this TPS.
   * The profile is kept for historical activity references, but login access is banned
   * and the petugas is detached from the TPS so it disappears from management views.
   */
  static async deletePetugas(adminId: string, tpsId: string, petugasId: string) {
    const { data: tps, error: tpsErr } = await supabase
      .from('tps_facilities')
      .select('id')
      .eq('id', tpsId)
      .eq('admin_id', adminId)
      .maybeSingle();

    if (tpsErr) throw tpsErr;
    if (!tps) throw new Error('TPS tidak ditemukan atau Anda bukan admin TPS ini.');

    const { data: petugas, error: petugasErr } = await supabase
      .from('profiles')
      .select('id, name, email, role, tps_id')
      .eq('id', petugasId)
      .eq('tps_id', tpsId)
      .eq('role', 'PETUGAS')
      .maybeSingle();

    if (petugasErr) throw petugasErr;
    if (!petugas) throw new Error('Petugas tidak ditemukan di TPS ini.');

    const { error: authErr } = await supabase.auth.admin.updateUserById(petugasId, {
      ban_duration: '876000h',
      user_metadata: {
        deleted: true,
        deleted_at: new Date().toISOString(),
        previous_role: 'PETUGAS',
      },
    });

    if (authErr) throw authErr;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        tps_id: null,
        name: `${petugas.name || 'Petugas'} (Dihapus)`,
      })
      .eq('id', petugasId);

    if (profileErr) throw profileErr;

    return { id: petugasId };
  }

  /**
   * Public listing of all TPS with aggregated stats.
   * Uses the denormalized activities.tps_id for efficient 1-hop aggregation.
   */
  static async getPublicTpsList() {
    // Get all TPS facilities with new normalized columns
    const { data: tpsList, error: tpsErr } = await supabase
      .from('tps_facilities')
      .select('id, name, type, address, city, province, coordinates, capacity_tons_per_day, created_at');

    if (tpsErr) throw tpsErr;
    if (!tpsList || tpsList.length === 0) return [];

    const tpsIds = tpsList.map(t => t.id);

    // Count petugas per TPS
    const { data: petugasProfiles, error: petErr } = await supabase
      .from('profiles')
      .select('id, tps_id')
      .in('tps_id', tpsIds)
      .eq('role', 'PETUGAS');

    if (petErr) throw petErr;

    const petugasCountMap = new Map<string, number>();
    for (const p of (petugasProfiles || [])) {
      if (p.tps_id) {
        petugasCountMap.set(p.tps_id, (petugasCountMap.get(p.tps_id) || 0) + 1);
      }
    }

    // Aggregate activities directly via tps_id (1-hop, no longer 3-hop)
    // Include both Tier 1 (activities) and Tier 2 (sku_aggregates)
    const activitiesByTps = new Map<string, { total: number; by_step: Record<string, number> }>();

    if (tpsIds.length > 0) {
      // Tier 1: activities
      const { data: activities, error: actErr } = await supabase
        .from('activities')
        .select('tps_id, biz_step')
        .in('tps_id', tpsIds);

      if (!actErr && activities) {
        for (const act of activities) {
          if (!act.tps_id) continue;
          const stats = activitiesByTps.get(act.tps_id) || { total: 0, by_step: {} };
          stats.total++;
          stats.by_step[act.biz_step] = (stats.by_step[act.biz_step] || 0) + 1;
          activitiesByTps.set(act.tps_id, stats);
        }
      }

      // Tier 2: sku_aggregates (count scan events, not units)
      const { data: aggregates, error: aggErr } = await supabase
        .from('sku_aggregates')
        .select('tps_id, biz_step, count')
        .in('tps_id', tpsIds);

      if (!aggErr && aggregates) {
        for (const agg of aggregates) {
          if (!agg.tps_id) continue;
          const stats = activitiesByTps.get(agg.tps_id) || { total: 0, by_step: {} };
          stats.total += agg.count;
          stats.by_step[agg.biz_step] = (stats.by_step[agg.biz_step] || 0) + agg.count;
          activitiesByTps.set(agg.tps_id, stats);
        }
      }
    }

    return tpsList.map(tps => {
      const stats = activitiesByTps.get(tps.id) || { total: 0, by_step: {} };

      // Calculate stage percentages (Tahap %)
      const stages: Record<string, number> = {};
      if (stats.total > 0) {
        for (const [step, count] of Object.entries(stats.by_step)) {
          stages[step] = Math.round((count / stats.total) * 100);
        }
      }

      return {
        id: tps.id,
        name: tps.name,
        type: tps.type,
        address: tps.address,
        city: tps.city,
        province: tps.province,
        capacity_tons_per_day: tps.capacity_tons_per_day || 0,
        petugas_count: petugasCountMap.get(tps.id) || 0,
        total_updates: stats.total,
        stages,
        created_at: tps.created_at,
      };
    });
  }
}
