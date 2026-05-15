import { supabase } from '../config/supabase';

const BIZ_STEP_LABELS: Record<string, string> = {
  collecting: 'Terkumpul',
  receiving: 'Diterima',
  inspecting: 'Dipilah',
  shipping: 'Diproses',
  recycling: 'Didaur ulang',
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
    city: string | null;
    province: string | null;
    capacity_tons_per_day: number;
    allowed_actions: string[];
  } | null;
  summary: {
    totalUpdates: number;
  };
  tps_stages: Record<string, number>; // biz_step → percentage (for this TPS)
  activities: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    gtin?: string;
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
        .select('id, name, type, address, city, province, capacity_tons_per_day, allowed_actions')
        .eq('id', profile.tps_id)
        .single();

      if (tpsData) {
        tps = tpsData;
      }
    }

    // Compute TPS-level stage stats (% per biz_step) via activities.tps_id
    let tpsStages: Record<string, number> = {};
    if (profile.tps_id) {
      const { data: tpsActivities, error: tpsActErr } = await supabase
        .from('activities')
        .select('biz_step')
        .eq('tps_id', profile.tps_id);

      if (!tpsActErr && tpsActivities && tpsActivities.length > 0) {
        const stepCounts: Record<string, number> = {};
        for (const act of tpsActivities) {
          const label = BIZ_STEP_LABELS[act.biz_step] || act.biz_step;
          stepCounts[label] = (stepCounts[label] || 0) + 1;
        }
        const total = tpsActivities.length;
        for (const [label, count] of Object.entries(stepCounts)) {
          tpsStages[label] = Math.round((count / total) * 100);
        }
      }
    }

    // Fetch recent activities (basic fields)
    const { data: activities, error: activitiesError, count } = await supabase
      .from('activities')
      .select('id, biz_step, location_name, timestamp, instance_id, gtin', { count: 'exact' })
      .eq('actor_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);

    if (activitiesError) throw activitiesError;

    // Resolve product info for each activity (Tier 1 via instance_id, Tier 2 via gtin)
    const resolvedActivities = await Promise.all(
      (activities || []).map(async (activity) => {
        let productName = '';
        let finalGtin = activity.gtin || '';

        if (activity.instance_id) {
          const { data: inst } = await supabase
            .from('product_instances')
            .select('product_id, products(gtin, product_name)')
            .eq('id', activity.instance_id)
            .single();

          if (inst) {
            const prod = inst.products as any;
            productName = prod?.product_name || '';
            finalGtin = prod?.gtin || finalGtin;
          }
        } else if (activity.gtin) {
          const { data: prod } = await supabase
            .from('products')
            .select('product_name')
            .eq('gtin', activity.gtin)
            .single();

          if (prod) {
            productName = prod.product_name;
          }
        }

        return {
          id: activity.id,
          title: productName || `${BIZ_STEP_LABELS[activity.biz_step] || activity.biz_step}`,
          gtin: finalGtin || '-',
          biz_step: BIZ_STEP_LABELS[activity.biz_step] || activity.biz_step,
          date: new Date(activity.timestamp).toISOString().slice(0, 10),
          location: activity.location_name || '-',
        };
      })
    );

    return {
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
      },
      tps,
      summary: {
        totalUpdates: count || resolvedActivities.length,
      },
      tps_stages: tpsStages,
      activities: resolvedActivities,
    };
  }
}