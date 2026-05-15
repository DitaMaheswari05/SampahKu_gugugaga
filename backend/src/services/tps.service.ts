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
    coordinates: { type: string; coordinates: number[] };
    radius_m?: number;
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
        coordinates: data.coordinates,
        radius_m: data.radius_m || 200,
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
   * Used for the public TPS directory on the landing page.
   */
  static async getPublicTpsList() {
    // Get all TPS facilities
    const { data: tpsList, error: tpsErr } = await supabase
      .from('tps_facilities')
      .select('id, name, type, address, coordinates, created_at');

    if (tpsErr) throw tpsErr;
    if (!tpsList || tpsList.length === 0) return [];

    // Get all petugas grouped by tps_id for counting
    const tpsIds = tpsList.map(t => t.id);

    // Get activity counts per TPS (via petugas profiles → activities)
    const { data: petugasProfiles, error: petErr } = await supabase
      .from('profiles')
      .select('id, tps_id')
      .in('tps_id', tpsIds)
      .eq('role', 'PETUGAS');

    if (petErr) throw petErr;

    const petugasIds = (petugasProfiles || []).map(p => p.id);
    const petugasTpsMap = new Map((petugasProfiles || []).map(p => [p.id, p.tps_id]));

    // Count activities and recycled per TPS
    let activitiesByTps = new Map<string, { total: number; recycled: number }>();

    if (petugasIds.length > 0) {
      const { data: activities, error: actErr } = await supabase
        .from('activities')
        .select('actor_id, biz_step')
        .in('actor_id', petugasIds);

      if (!actErr && activities) {
        for (const act of activities) {
          const tpsId = petugasTpsMap.get(act.actor_id);
          if (!tpsId) continue;

          const stats = activitiesByTps.get(tpsId) || { total: 0, recycled: 0 };
          stats.total++;
          if (act.biz_step === 'recycling') stats.recycled++;
          activitiesByTps.set(tpsId, stats);
        }
      }
    }

    // Count petugas per TPS
    const petugasCountMap = new Map<string, number>();
    for (const p of (petugasProfiles || [])) {
      if (p.tps_id) {
        petugasCountMap.set(p.tps_id, (petugasCountMap.get(p.tps_id) || 0) + 1);
      }
    }

    return tpsList.map(tps => {
      const stats = activitiesByTps.get(tps.id) || { total: 0, recycled: 0 };
      const recoveryRate = stats.total > 0
        ? Math.round((stats.recycled / stats.total) * 100)
        : 0;

      return {
        id: tps.id,
        name: tps.name,
        type: tps.type,
        address: tps.address,
        petugas_count: petugasCountMap.get(tps.id) || 0,
        total_activities: stats.total,
        recycled_count: stats.recycled,
        recovery_rate: recoveryRate,
        created_at: tps.created_at,
      };
    });
  }
}
