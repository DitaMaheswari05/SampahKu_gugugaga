import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  registerTps,
  getMyTps,
  getMyTpsDashboard,
  createPetugas,
  getTpsPetugas,
  deletePetugas,
} from '../controllers/tps.controller';

const router = Router();

// All TPS management routes require authentication
router.post('/', protect, registerTps);
router.get('/me/dashboard', protect, getMyTpsDashboard);
router.get('/me', protect, getMyTps);
router.post('/:id/petugas', protect, createPetugas);
router.get('/:id/petugas', protect, getTpsPetugas);
router.delete('/:id/petugas/:petugasId', protect, deletePetugas);

export default router;
