import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  scanInstance,
  scanBarcode,
  discardBarcode,
  getGtinAggregateStats,
  getGtinRecentActivities,
} from '../controllers/instances.controller';
import { getInstanceActivities } from '../controllers/konsumen.controller';

const router = Router();

/** POST /instances/:id/scan — Scan & catat aktivitas (KONSUMEN/PETUGAS) */
router.post('/:id/scan', protect, scanInstance);

/** GET /instances/:id/activities — Timeline perjalanan instance (semua role yang login) */
router.get('/:id/activities', protect, getInstanceActivities);

/** POST /instances/scan-barcode — Scan barcode GTIN untuk Tier 2 (PETUGAS) */
router.post('/scan-barcode', protect, scanBarcode);

/** POST /instances/discard-barcode — Discard barcode untuk KONSUMEN (Tier 2) */
router.post('/discard-barcode', protect, discardBarcode);

/** GET /instances/:gtin/aggregate-stats — Ambil statistik agregat Tier 2 */
router.get('/:gtin/aggregate-stats', protect, getGtinAggregateStats);

/** GET /instances/:gtin/aggregate-activities — Ambil aktivitas terbaru Tier 2 */
router.get('/:gtin/aggregate-activities', protect, getGtinRecentActivities);

export default router;
