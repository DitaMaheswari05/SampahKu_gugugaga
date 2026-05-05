import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { getMyCollections } from '../controllers/konsumen.controller';

const router = Router();

/** GET /users/me/collections */
router.get('/me/collections', protect, getMyCollections);

export default router;
