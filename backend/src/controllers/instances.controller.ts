import { Request, Response } from 'express';
import { InstancesService } from '../services/instances.service';
import { KonsumenService } from '../services/konsumen.service';
import { ROLES } from '../constants';

export const scanInstance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { biz_step, location_name, facility_type, coordinates, epcis_body, evidence_url, material_type } = req.body;

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
    const result = await InstancesService.recordScan(String(id), String(req.profile.id), String(biz_step), { location_name, facility_type, coordinates, epcis_body, evidence_url, material_type });
    return res.status(201).json({ status: 'success', data: result });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to record scan' });
  }
};

/**
 * Scan barcode GTIN untuk Tier 2 (PETUGAS).
 * POST /instances/scan-barcode
 * Body: { gtin, biz_step, location_name, facility_type, coordinates, evidence_url }
 */
export const scanBarcode = async (req: Request, res: Response) => {
  const { gtin, biz_step, location_name, facility_type, coordinates, evidence_url, material_type } = req.body;

  if (!req.profile) return res.status(403).json({ status: 'error', message: 'Profile required' });
  if (req.profile.role !== 'PETUGAS') {
    return res.status(403).json({ status: 'error', message: 'Only PETUGAS may scan barcodes' });
  }

  if (!gtin || !biz_step) {
    return res.status(400).json({ status: 'error', message: 'gtin and biz_step required' });
  }

  try {
    const result = await InstancesService.recordAggregateScan(
      String(gtin),
      String(req.profile.id),
      String(biz_step),
      { location_name, facility_type, coordinates, evidence_url, material_type }
    );
    return res.status(201).json({ status: 'success', data: result });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to record barcode scan' });
  }
};

/**
 * Discard barcode untuk KONSUMEN (Tier 2).
 * POST /instances/discard-barcode
 * Body: { gtin, coordinates, location_name, evidence_url }
 */
export const discardBarcode = async (req: Request, res: Response) => {
  const { gtin, coordinates, location_name, evidence_url } = req.body;

  if (!req.profile) return res.status(403).json({ status: 'error', message: 'Profile required' });
  if (req.profile.role !== 'KONSUMEN') {
    return res.status(403).json({ status: 'error', message: 'Only KONSUMEN may discard' });
  }

  if (!gtin) {
    return res.status(400).json({ status: 'error', message: 'gtin required' });
  }

  try {
    const result = await InstancesService.recordBarcodeDiscard(String(gtin), String(req.profile.id), {
      coordinates,
      location_name,
      evidence_url,
    });
    return res.status(201).json({ status: 'success', data: result });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to record discard' });
  }
};

/**
 * Get aggregate stats untuk Tier 2 GTIN.
 * GET /instances/:gtin/aggregate-stats
 */
export const getGtinAggregateStats = async (req: Request, res: Response) => {
  const { gtin } = req.params;

  if (!req.profile) return res.status(403).json({ status: 'error', message: 'Profile required' });

  try {
    const stats = await KonsumenService.getGtinAggregateStats(String(gtin));
    return res.status(200).json({ status: 'success', data: stats });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to fetch aggregate stats' });
  }
};

/**
 * Get recent activities untuk Tier 2 GTIN.
 * GET /instances/:gtin/aggregate-activities?limit=5
 */
export const getGtinRecentActivities = async (req: Request, res: Response) => {
  const { gtin } = req.params;
  const limit = Number(req.query.limit || 5);

  if (!req.profile) return res.status(403).json({ status: 'error', message: 'Profile required' });

  try {
    const activities = await KonsumenService.getGtinRecentActivities(
      String(gtin),
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100
    );
    return res.status(200).json({ status: 'success', data: activities });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to fetch aggregate activities' });
  }
};
