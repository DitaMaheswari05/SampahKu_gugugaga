import { Request, Response } from 'express';
import { PetugasService } from '../services/petugas.service';

export const getDashboard = async (req: Request, res: Response) => {
  if (!req.profile || req.profile.role !== 'PETUGAS') {
    return res.status(403).json({ status: 'error', message: 'Only PETUGAS can access this dashboard' });
  }

  try {
    const data = await PetugasService.getDashboard(req.profile.id);
    return res.status(200).json({ status: 'success', data });
  } catch (e: any) {
    console.error('getDashboard petugas error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to load petugas dashboard' });
  }
};