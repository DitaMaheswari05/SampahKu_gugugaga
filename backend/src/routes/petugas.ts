import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { getDashboard } from '../controllers/petugas.controller';

const router = Router();

router.get('/dashboard', protect, getDashboard);

export default router;