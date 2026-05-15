import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';

export const createProduct = async (req: Request, res: Response) => {
  if (!req.profile || req.profile.role !== 'BRAND') {
    return res.status(403).json({ status: 'error', message: 'Only BRAND can create products' });
  }

  const { sku, product_name, material_passport, category, weight_grams } = req.body;

  if (!sku || !product_name) {
    return res.status(400).json({ status: 'error', message: 'sku and product_name are required' });
  }

  try {
    const product = await ProductService.createProduct(req.profile.id, {
      sku,
      product_name,
      material_passport,
      category,
      weight_grams,
    });
    return res.status(201).json({ status: 'success', data: product });
  } catch (e: any) {
    console.error('createProduct error:', e);
    // Handle duplicate GTIN
    if (e.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'GTIN already exists' });
    }
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to create product' });
  }
};

export const createInstance = async (req: Request, res: Response) => {
  if (!req.profile || req.profile.role !== 'BRAND') {
    return res.status(403).json({ status: 'error', message: 'Only BRAND can create instances' });
  }

  const gtin = req.params.gtin as string;
  const { identification_type, identity_number, batch_number, serial_number, quantity } = req.body;

  if (!identification_type || !['BATCH', 'UNIQUE'].includes(identification_type)) {
    return res.status(400).json({ status: 'error', message: 'identification_type must be BATCH or UNIQUE' });
  }

  try {
    const result = await ProductService.createInstance(gtin, req.profile.id, {
      identification_type,
      identity_number: identity_number ? Number(identity_number) : undefined,
      batch_number,
      serial_number,
      quantity: quantity ? Number(quantity) : undefined,
    });
    return res.status(201).json({ status: 'success', data: result });
  } catch (e: any) {
    console.error('createInstance error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to create instance' });
  }
};

export const listProducts = async (req: Request, res: Response) => {
  if (!req.profile || req.profile.role !== 'BRAND') {
    return res.status(403).json({ status: 'error', message: 'Only BRAND can list their products' });
  }

  try {
    const products = await ProductService.getProductsByBrand(req.profile.id);
    return res.status(200).json({ status: 'success', data: products });
  } catch (e: any) {
    console.error('listProducts error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to list products' });
  }
};

export const getProductDetail = async (req: Request, res: Response) => {
  const gtin = req.params.gtin as string;

  try {
    const detail = await ProductService.getProductDetail(gtin);
    return res.status(200).json({ status: 'success', data: detail });
  } catch (e: any) {
    console.error('getProductDetail error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to get product detail' });
  }
};

export const getInstanceQR = async (req: Request, res: Response) => {
  const instanceId = req.params.instanceId as string;

  try {
    const result = await ProductService.getInstanceQR(instanceId);
    return res.status(200).json({ status: 'success', data: result });
  } catch (e: any) {
    console.error('getInstanceQR error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to generate QR' });
  }
};

/**
 * Resolve a barcode GTIN → product info (preview only, no scan recorded).
 * GET /products/resolve-barcode/:gtin
 * Used by PetugasScan / KonsumenScan to show product details before confirming.
 */
export const resolveBarcode = async (req: Request, res: Response) => {
  const { gtin } = req.params;

  if (!gtin) {
    return res.status(400).json({ status: 'error', message: 'gtin is required' });
  }

  try {
    const product = await ProductService.resolveOrCreateFromBarcode(String(gtin));
    return res.status(200).json({
      status: 'success',
      data: {
        gtin: product.gtin,
        product_name: product.product_name,
        category: product.category,
        source: product.source,
        image_url: product.material_passport?.image_url || null,
        material_passport: product.material_passport,
      },
    });
  } catch (e: any) {
    console.error('resolveBarcode error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to resolve barcode' });
  }
};

export const resolveQR = async (req: Request, res: Response) => {
  const { gtin, batch, serial } = req.query;

  if (!gtin) {
    return res.status(400).json({ status: 'error', message: 'gtin is required' });
  }

  if (!batch && !serial) {
    return res.status(400).json({ status: 'error', message: 'Either batch or serial must be provided' });
  }

  const identification_type = batch ? 'BATCH' : 'UNIQUE';
  const identifier = (batch || serial) as string;

  try {
    const instance = await ProductService.resolveGS1(gtin as string, identification_type, identifier);
    return res.status(200).json({ status: 'success', data: instance });
  } catch (e: any) {
    console.error('resolveQR error:', e);
    return res.status(404).json({ status: 'error', message: e.message || 'Failed to resolve GS1 link' });
  }
};
