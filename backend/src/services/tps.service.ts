import { supabase } from '../config/supabase';
import { AuthService } from './auth.service';

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
   * Public listing of all TPS with aggregated stats.
   * Uses the denormalized activities.tps_id for efficient 1-hop aggregation.
   */
  static async getPublicTpsList() {
    // Get all TPS facilities with new normalized columns
    const { data: tpsList, error: tpsErr } = await supabase
      .from('tps_facilities')
      .select('id, name, type, address, city, province, coordinates, capacity_tons_per_day, is_verified, created_at');

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
    const activitiesByTps = new Map<string, { total: number; by_step: Record<string, number> }>();

    if (tpsIds.length > 0) {
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
        is_verified: tps.is_verified || false,
        petugas_count: petugasCountMap.get(tps.id) || 0,
        total_updates: stats.total,
        stages,
        created_at: tps.created_at,
      };
    });
  }
}
