import { Request, Response } from 'express';
import { TpsService } from '../services/tps.service';

export const registerTps = async (req: Request, res: Response) => {
  try {
    if (req.profile?.role !== 'ADMIN_TPS') {
      return res.status(403).json({ status: 'error', message: 'Hanya ADMIN_TPS yang bisa mendaftarkan TPS.' });
    }

    const { name, type, address, city, province, coordinates, radius_m, capacity_tons_per_day, allowed_actions } = req.body;

    if (!name || !type || !address || !city || !province || !coordinates || !allowed_actions) {
      return res.status(400).json({ status: 'error', message: 'Field name, type, address, city, province, coordinates, dan allowed_actions wajib diisi.' });
    }

    const tps = await TpsService.registerTps(req.profile.id, {
      name, type, address, city, province, coordinates, radius_m, capacity_tons_per_day, allowed_actions
    });

    return res.status(201).json({ status: 'success', data: tps });
  } catch (e: any) {
    console.error('registerTps error:', e);
    return res.status(400).json({ status: 'error', message: e.message || 'Gagal mendaftarkan TPS' });
  }
};

export const getMyTps = async (req: Request, res: Response) => {
  try {
    if (req.profile?.role !== 'ADMIN_TPS') {
      return res.status(403).json({ status: 'error', message: 'Hanya ADMIN_TPS.' });
    }

    const tps = await TpsService.getMyTps(req.profile.id);
    return res.json({ status: 'success', data: tps });
  } catch (e: any) {
    console.error('getMyTps error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Gagal memuat TPS' });
  }
};

export const getMyTpsDashboard = async (req: Request, res: Response) => {
  try {
    if (req.profile?.role !== 'ADMIN_TPS') {
      return res.status(403).json({ status: 'error', message: 'Hanya ADMIN_TPS.' });
    }

    const dashboard = await TpsService.getMyTpsDashboard(req.profile.id);
    return res.json({ status: 'success', data: dashboard });
  } catch (e: any) {
    console.error('getMyTpsDashboard error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Gagal memuat dashboard TPS' });
  }
};

export const createPetugas = async (req: Request, res: Response) => {
  try {
    if (req.profile?.role !== 'ADMIN_TPS') {
      return res.status(403).json({ status: 'error', message: 'Hanya ADMIN_TPS.' });
    }

    const tpsId = req.params.id as string;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'Field name, email, dan password wajib diisi.' });
    }

    const petugas = await TpsService.createPetugas(req.profile.id, tpsId, { name, email, password });
    return res.status(201).json({ status: 'success', data: petugas });
  } catch (e: any) {
    console.error('createPetugas error:', e);
    return res.status(400).json({ status: 'error', message: e.message || 'Gagal membuat akun petugas' });
  }
};

export const getTpsPetugas = async (req: Request, res: Response) => {
  try {
    if (req.profile?.role !== 'ADMIN_TPS') {
      return res.status(403).json({ status: 'error', message: 'Hanya ADMIN_TPS.' });
    }

    const tpsId = req.params.id as string;
    const petugas = await TpsService.getTpsPetugas(req.profile.id, tpsId);
    return res.json({ status: 'success', data: petugas });
  } catch (e: any) {
    console.error('getTpsPetugas error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Gagal memuat daftar petugas' });
  }
};

export const deletePetugas = async (req: Request, res: Response) => {
  try {
    if (req.profile?.role !== 'ADMIN_TPS') {
      return res.status(403).json({ status: 'error', message: 'Hanya ADMIN_TPS.' });
    }

    const tpsId = req.params.id as string;
    const petugasId = req.params.petugasId as string;

    if (!petugasId) {
      return res.status(400).json({ status: 'error', message: 'petugasId wajib diisi.' });
    }

    const result = await TpsService.deletePetugas(req.profile.id, tpsId, petugasId);
    return res.json({ status: 'success', data: result });
  } catch (e: any) {
    console.error('deletePetugas error:', e);
    return res.status(400).json({ status: 'error', message: e.message || 'Gagal menghapus akun petugas' });
  }
};

export const getPublicTpsList = async (_req: Request, res: Response) => {
  try {
    const list = await TpsService.getPublicTpsList();
    return res.json({ status: 'success', data: list });
  } catch (e: any) {
    console.error('getPublicTpsList error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Gagal memuat daftar TPS' });
  }
};
