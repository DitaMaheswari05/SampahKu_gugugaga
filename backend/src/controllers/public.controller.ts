import { Request, Response } from 'express';
import { PublicService } from '../services/public.service';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const stats = await PublicService.getDashboardStats();
    return res.json({ status: 'success', data: stats });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to get dashboard stats' });
  }
};
