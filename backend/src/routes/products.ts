import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  createProduct,
  createInstance,
  listProducts,
  getProductDetail,
  getInstanceQR,
  resolveQR,
} from '../controllers/product.controller';

const router = Router();

// Endpoint for resolving GS1 Links. Placed here to avoid param collision. Public endpoint.
router.get('/resolve', resolveQR);

// Specific endpoints that shouldn't match /:gtin
router.get('/instances/:instanceId/qr', protect, getInstanceQR);

// Generic endpoints
router.get('/', protect, listProducts);
router.post('/', protect, createProduct);
router.post('/:gtin/instances', protect, createInstance);
router.get('/:gtin', protect, getProductDetail);

export default router;
