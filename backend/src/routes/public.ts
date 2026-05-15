import { Router } from 'express';
import { getDashboardStats } from '../controllers/public.controller';
import { getPublicTpsList } from '../controllers/tps.controller';

const router = Router();

router.get('/dashboard/stats', getDashboardStats);
router.get('/public/tps', getPublicTpsList);

export default router;
