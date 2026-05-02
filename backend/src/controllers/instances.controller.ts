import { Request, Response } from 'express';
import { InstancesService } from '../services/instances.service';
import { ROLES } from '../constants';

export const scanInstance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { biz_step, location_name, facility_type, coordinates, epcis_body, evidence_url } = req.body;

  if (!req.profile) return res.status(403).json({ status: 'error', message: 'Profile required' });

  // role-based checks: only KONSUMEN may perform 'discarding'
  if (biz_step === 'discarding' && req.profile.role !== 'KONSUMEN') {
    return res.status(403).json({ status: 'error', message: 'Only KONSUMEN may perform discarding' });
  }

  // PETUGAS required for most other biz_steps
  const petugasOnly = ['collecting', 'receiving', 'inspecting', 'shipping', 'recycling', 'disposing'];
  if (petugasOnly.includes(biz_step) && req.profile.role !== 'PETUGAS') {
    return res.status(403).json({ status: 'error', message: 'Only PETUGAS may perform this action' });
  }

  try {
    const result = await InstancesService.recordScan(id, req.profile.id, biz_step, { location_name, facility_type, coordinates, epcis_body, evidence_url });
    return res.status(201).json({ status: 'success', data: result });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to record scan' });
  }
};
