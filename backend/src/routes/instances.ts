import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { scanInstance } from '../controllers/instances.controller';

const router = Router();

router.post('/:id/scan', protect, scanInstance);

export default router;
