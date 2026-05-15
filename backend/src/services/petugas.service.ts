import { supabase } from '../config/supabase';

const BIZ_STEP_LABELS: Record<string, string> = {
  collecting: 'Terkumpul',
  receiving: 'Diterima',
  inspecting: 'Dipilah',
  shipping: 'Diproses',
  recycling: 'Didaur Ulang',
  disposing: 'Dibuang',
  discarding: 'Dibuang',
  commissioning: 'Terkumpul',
};

export type PetugasDashboardData = {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tps: {
    id: string;
    name: string;
    type: string;
    address: string;
    allowed_actions: string[];
  } | null;
  summary: {
    totalUpdates: number;
  };
  activities: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
  }>;
};

export class PetugasService {
  static async getDashboard(userId: string): Promise<PetugasDashboardData> {
    // Fetch profile (no points column anymore)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role, tps_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw profileError || new Error('Profile not found');
    }

    // Fetch TPS info if petugas is linked to one
    let tps = null;
    if (profile.tps_id) {
      const { data: tpsData } = await supabase
        .from('tps_facilities')
        .select('id, name, type, address, allowed_actions')
        .eq('id', profile.tps_id)
        .single();

      if (tpsData) {
        tps = tpsData;
      }
    }

    // Fetch recent activities (no points query)
    const { data: activities, error: activitiesError, count } = await supabase
      .from('activities')
      .select('id, biz_step, location_name, timestamp', { count: 'exact' })
      .eq('actor_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);

    if (activitiesError) {
      throw activitiesError;
    }

    return {
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
      },
      tps,
      summary: {
        totalUpdates: count || activities?.length || 0,
      },
      activities: (activities || []).map((activity) => ({
        id: activity.id,
        title: `Memperbarui status: ${BIZ_STEP_LABELS[activity.biz_step] || activity.biz_step}`,
        date: new Date(activity.timestamp).toISOString().slice(0, 10),
        location: activity.location_name || '-',
      })),
    };
  }
}