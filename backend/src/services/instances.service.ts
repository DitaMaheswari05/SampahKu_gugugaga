import { supabase } from '../config/supabase';
import * as crypto from 'crypto';

const BIZ_STEP_TO_STATUS: Record<string, string> = {
  commissioning: 'IN_MARKET',
  discarding: 'DISCARDED',
  collecting: 'PICKED_UP',
  receiving: 'AT_TPS',
  inspecting: 'SORTED',
  shipping: 'IN_TRANSIT',
  recycling: 'RECYCLED',
  disposing: 'DISPOSED'
};

/**
 * Calculate Haversine distance in meters between two lat/lng pairs.
 * Used for geo-fence validation when PETUGAS scans.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class InstancesService {
  static async recordScan(instanceId: string, actorId: string, biz_step: string, payload: any = {}) {
    const newStatus = BIZ_STEP_TO_STATUS[biz_step];
    if (!newStatus) throw new Error('Invalid biz_step');

    let resolvedTpsId: string | null = null;

    // ── PETUGAS validation: allowed_actions + geo-fence ──
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('role, tps_id')
      .eq('id', actorId)
      .single();

    if (actorProfile?.role === 'PETUGAS') {
      if (!actorProfile.tps_id) {
        throw new Error('Petugas tidak terikat ke TPS manapun.');
      }

      resolvedTpsId = actorProfile.tps_id;

      const { data: tps } = await supabase
        .from('tps_facilities')
        .select('allowed_actions, coordinates, radius_m, name')
        .eq('id', actorProfile.tps_id)
        .single();

      if (!tps) throw new Error('TPS tidak ditemukan.');

      // Check allowed_actions
      if (!tps.allowed_actions.includes(biz_step)) {
        throw new Error(`TPS "${tps.name}" tidak memiliki izin untuk aksi '${biz_step}'.`);
      }

      // Check geo-fence
      if (payload.coordinates && payload.coordinates.lat != null && payload.coordinates.lng != null) {
        const userLat = payload.coordinates.lat;
        const userLng = payload.coordinates.lng;
        // TPS coordinates in GeoJSON format: { type: "Point", coordinates: [lng, lat] }
        const tpsLng = tps.coordinates.coordinates[0];
        const tpsLat = tps.coordinates.coordinates[1];
        const distance = haversineDistance(userLat, userLng, tpsLat, tpsLng);

        if (distance > tps.radius_m) {
          throw new Error(
            `Anda berada di luar jangkauan TPS (${Math.round(distance)}m dari TPS, batas ${tps.radius_m}m).`
          );
        }
      } else {
        throw new Error('Koordinat GPS wajib dikirim saat scan sebagai petugas.');
      }
    }

    // ── Build EPCIS body ──
    let epcisBody = payload.epcis_body || {};
    if (biz_step === 'inspecting' && payload.material_type) {
      epcisBody = { ...epcisBody, material_type: payload.material_type };
    }

    const timestamp = new Date().toISOString();

    // ── Insert activity ──
    const activity = {
      instance_id: instanceId,
      actor_id: actorId,
      biz_step,
      location_name: payload.location_name || null,
      facility_type: payload.facility_type || null,
      coordinates: payload.coordinates || null,
      epcis_body: Object.keys(epcisBody).length > 0 ? epcisBody : null,
      timestamp,
      evidence_url: payload.evidence_url || null,
      blockchain_hash: '',
      tps_id: resolvedTpsId,
    };

    // Generate SHA-256 integrity hash
    const hashPayload = `${instanceId}:${actorId}:${biz_step}:${timestamp}:${JSON.stringify(activity.epcis_body)}`;
    activity.blockchain_hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const { data: activityData, error: actErr } = await supabase
      .from('activities')
      .insert([activity])
      .select()
      .single();

    if (actErr) throw actErr;

    // ── Update instance status ──
    const { error: updErr } = await supabase
      .from('product_instances')
      .update({ current_status: newStatus, last_updated: new Date().toISOString() })
      .eq('id', instanceId);

    if (updErr) throw updErr;

    return { activity: activityData, newStatus };
  }
}
