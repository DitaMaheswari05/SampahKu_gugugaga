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

const BIZ_STEP_POINTS: Record<string, number> = {
  collecting: 50,
  receiving: 50,
  inspecting: 50,
  shipping: 50,
  recycling: 100,
  disposing: 25,
  discarding: 25,
  commissioning: 50,
};

export type PetugasDashboardData = {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    points: number;
  };
  summary: {
    totalPoints: number;
    totalUpdates: number;
    progressReward: number;
    remainingPoints: number;
  };
  activities: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    points: string;
  }>;
};

export class PetugasService {
  static async getDashboard(userId: string): Promise<PetugasDashboardData> {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role, points')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw profileError || new Error('Profile not found');
    }

    const { data: activities, error: activitiesError, count } = await supabase
      .from('activities')
      .select('id, biz_step, location_name, timestamp', { count: 'exact' })
      .eq('actor_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);

    if (activitiesError) {
      throw activitiesError;
    }

    const activityIds = (activities || []).map((item) => item.id);
    let pointMap = new Map<string, number>();

    if (activityIds.length > 0) {
      const { data: pointHistory } = await supabase
        .from('point_history')
        .select('activity_id, points_earned')
        .eq('user_id', userId)
        .in('activity_id', activityIds);

      pointMap = new Map(
        (pointHistory || [])
          .filter((item) => item.activity_id)
          .map((item) => [item.activity_id as string, Number(item.points_earned || 0)])
      );
    }

    const totalPoints = Number((profile as any).points || 0);
    const rewardTarget = 1000;
    const remainingPoints = Math.max(rewardTarget - totalPoints, 0);
    const progressReward = rewardTarget > 0 ? Math.min((totalPoints / rewardTarget) * 100, 100) : 0;

    return {
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        points: totalPoints,
      },
      summary: {
        totalPoints,
        totalUpdates: count || activities?.length || 0,
        progressReward,
        remainingPoints,
      },
      activities: (activities || []).map((activity) => {
        const points = pointMap.get(activity.id) ?? BIZ_STEP_POINTS[activity.biz_step] ?? 0;
        return {
          id: activity.id,
          title: `Memperbarui status: ${BIZ_STEP_LABELS[activity.biz_step] || activity.biz_step}`,
          date: new Date(activity.timestamp).toISOString().slice(0, 10),
          location: activity.location_name || '-',
          points: `+${points}`,
        };
      }),
    };
  }
}