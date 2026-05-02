import { Router } from 'express';
import multer from 'multer';
import { uploadEvidence } from '../controllers/upload.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/evidence', protect, upload.single('evidence'), uploadEvidence);

export default router;
