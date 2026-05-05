import { Request, Response } from 'express';
import { KonsumenService } from '../services/konsumen.service';

/** GET /users/me/collections — Daftar sampah yang pernah dikumpulkan konsumen */
export const getMyCollections = async (req: Request, res: Response) => {
  if (!req.profile) {
    return res.status(403).json({ status: 'error', message: 'Profile required' });
  }
  if (req.profile.role !== 'KONSUMEN') {
    return res.status(403).json({ status: 'error', message: 'Only KONSUMEN can access collections' });
  }
  try {
    const collections = await KonsumenService.getMyCollections(String(req.profile.id));
    return res.json({ status: 'success', data: collections });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to get collections' });
  }
};

/** GET /instances/:id/activities — Timeline perjalanan sebuah product instance */
export const getInstanceActivities = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await KonsumenService.getInstanceActivities(String(id));
    return res.json({ status: 'success', data: result });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to get activities' });
  }
};
