import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { registerTps, getMyTps, createPetugas, getTpsPetugas } from '../controllers/tps.controller';

const router = Router();

// All TPS management routes require authentication
router.post('/', protect, registerTps);
router.get('/me', protect, getMyTps);
router.post('/:id/petugas', protect, createPetugas);
router.get('/:id/petugas', protect, getTpsPetugas);

export default router;
