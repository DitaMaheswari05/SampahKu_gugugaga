import { supabase } from '../config/supabase';

export class PointsService {
  static async awardPoints(userId: string, points: number, activityId?: string, description?: string) {
    // Best-effort: insert history then update profile total. Recommend DB-side function for true atomicity.
    const client = supabase;

    const { data, error } = await client.from('point_history').insert([
      {
        user_id: userId,
        points_earned: points,
        activity_id: activityId || null,
        description: description || null
      }
    ]);

    if (error) throw error;

    // Use fetch-then-update for points.
    // Note: For true atomicity in production, use a Postgres RPC function instead.
    try {
      const { data: profile } = await client.from('profiles').select('points').eq('id', userId).single();
      const current = (profile as any)?.points || 0;
      await client.from('profiles').update({ points: current + points }).eq('id', userId);
    } catch (e) {
      console.error('Failed to update profile points', e);
    }

    return data;
  }
}
