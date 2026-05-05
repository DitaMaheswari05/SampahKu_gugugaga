import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { scanInstance } from '../controllers/instances.controller';
import { getInstanceActivities } from '../controllers/konsumen.controller';

const router = Router();

/** POST /instances/:id/scan — Scan & catat aktivitas (KONSUMEN/PETUGAS) */
router.post('/:id/scan', protect, scanInstance);

/** GET /instances/:id/activities — Timeline perjalanan instance (semua role yang login) */
router.get('/:id/activities', protect, getInstanceActivities);

export default router;
