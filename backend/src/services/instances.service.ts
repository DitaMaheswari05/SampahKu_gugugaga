import { supabase } from '../config/supabase';
import { POINTS } from '../constants';
import { PointsService } from './points.service';
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

export class InstancesService {
  static async recordScan(instanceId: string, actorId: string, biz_step: string, payload: any = {}) {
    const newStatus = BIZ_STEP_TO_STATUS[biz_step];
    if (!newStatus) throw new Error('Invalid biz_step');

    // Create a base EPCIS body if not provided
    let epcisBody = payload.epcis_body || {};
    if (biz_step === 'inspecting' && payload.material_type) {
      epcisBody = {
        ...epcisBody,
        material_type: payload.material_type
      };
    }

    const timestamp = new Date().toISOString();

    // insert activity
    const activity = {
      instance_id: instanceId,
      actor_id: actorId,
      biz_step,
      location_name: payload.location_name || null,
      facility_type: payload.facility_type || null,
      coordinates: payload.coordinates || null,
      epcis_body: Object.keys(epcisBody).length > 0 ? epcisBody : null,
      timestamp: timestamp,
      evidence_url: payload.evidence_url || null,
      blockchain_hash: ''
    };

    // Generate SHA-256 hash to simulate Hyperledger
    const hashPayload = `${instanceId}:${actorId}:${biz_step}:${timestamp}:${JSON.stringify(activity.epcis_body)}`;
    activity.blockchain_hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const { data: activityData, error: actErr } = await supabase.from('activities').insert([activity]).select().single();
    if (actErr) throw actErr;

    // update instance status
    const { error: updErr } = await supabase.from('product_instances').update({ current_status: newStatus, last_updated: new Date().toISOString() }).eq('id', instanceId);
    if (updErr) throw updErr;

    // award points best-effort
    try {
      const points = (POINTS as any)[newStatus] || POINTS.DISCARDED || 1;
      await PointsService.awardPoints(actorId, points, (activityData as any).id, `Points for ${biz_step}`);
    } catch (e) {
      console.error('Failed awarding points', e);
    }

    return { activity: activityData, newStatus };
  }
}
