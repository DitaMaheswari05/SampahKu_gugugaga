import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  createProduct,
  createInstance,
  listProducts,
  getProductDetail,
  getInstanceQR,
} from '../controllers/product.controller';

const router = Router();

// All routes require authentication
// NOTE: /instances/* routes MUST come before /:gtin to avoid matching "instances" as a GTIN param
router.get('/instances/:instanceId/qr', protect, getInstanceQR);
router.get('/', protect, listProducts);
router.get('/:gtin', protect, getProductDetail);
router.post('/', protect, createProduct);
router.post('/:gtin/instances', protect, createInstance);

export default router;
