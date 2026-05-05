import { Router } from 'express';
import { getDashboardStats } from '../controllers/public.controller';

const router = Router();

router.get('/dashboard/stats', getDashboardStats);

export default router;
