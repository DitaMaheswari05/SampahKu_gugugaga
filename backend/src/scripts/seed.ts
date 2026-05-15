import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { supabase } from '../config/supabase';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';
import { InstancesService } from '../services/instances.service';

const clearDatabase = async () => {
  console.log('Clearing old data...');
  await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('sku_aggregates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('product_instances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().neq('gtin', '0');
  await supabase.from('tps_facilities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brand_gtin_prefixes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};

const runSeed = async () => {
  try {
    console.log('Starting Seeding...');
    await clearDatabase();

    const PASS = '123456';

    console.log('1. Creating Users...');
    // Produsen
    await AuthService.register('produsen@demo.com', PASS, 'PT. Produsen Demo', 'BRAND');
    // Konsumen
    await AuthService.register('konsumen@demo.com', PASS, 'Budi Konsumen', 'KONSUMEN');
    // Admin TPS
    await AuthService.register('admintps1@demo.com', PASS, 'Admin TPS 1', 'ADMIN_TPS');
    await AuthService.register('admintps2@demo.com', PASS, 'Admin TPS 2', 'ADMIN_TPS');
    // Petugas
    await AuthService.register('petugas1@demo.com', PASS, 'Petugas 1', 'PETUGAS');
    await AuthService.register('petugas2@demo.com', PASS, 'Petugas 2', 'PETUGAS');

    // Fetch user IDs
    const resolveUser = async (email: string) => {
      const { data } = await supabase.from('profiles').select('id').eq('email', email).single();
      if (!data) throw new Error(`User not found: ${email}`);
      return data.id;
    };

    const produsenId = await resolveUser('produsen@demo.com');
    const konsumenId = await resolveUser('konsumen@demo.com');
    const adminTps1Id = await resolveUser('admintps1@demo.com');
    const adminTps2Id = await resolveUser('admintps2@demo.com');
    const petugas1Id = await resolveUser('petugas1@demo.com');
    const petugas2Id = await resolveUser('petugas2@demo.com');

    console.log('2. Creating TPS Facilities & Assigning Petugas...');
    const tpsActions1 = ['collecting', 'receiving', 'inspecting', 'shipping', 'recycling'];
    const tpsActions2 = ['receiving', 'inspecting', 'shipping', 'recycling']; // TPS 2 cannot collect

    const { data: tps1, error: tpsErr1 } = await supabase.from('tps_facilities').insert([{
      name: 'TPS3R Demo 1',
      type: 'TPS3R',
      address: 'Jl. Demo 1',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      coordinates: { type: 'Point', coordinates: [106.8229, -6.1944] },
      radius_m: 1000,
      capacity_tons_per_day: 5,
      allowed_actions: tpsActions1,
      admin_id: adminTps1Id
    }]).select().single();
    if (tpsErr1) throw tpsErr1;

    const { data: tps2, error: tpsErr2 } = await supabase.from('tps_facilities').insert([{
      name: 'TPS3R Demo 2',
      type: 'TPS3R',
      address: 'Jl. Demo 2',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      coordinates: { type: 'Point', coordinates: [106.8229, -6.2944] },
      radius_m: 1000,
      capacity_tons_per_day: 3,
      allowed_actions: tpsActions2,
      admin_id: adminTps2Id
    }]).select().single();
    if (tpsErr2) throw tpsErr2;

    await supabase.from('profiles').update({ tps_id: tps1.id }).eq('id', petugas1Id);
    await supabase.from('profiles').update({ tps_id: tps2.id }).eq('id', petugas2Id);

    // Ensure Brand has a prefix (since user might already exist and bypassed AuthService registration logic)
    const { data: prefixData } = await supabase.from('brand_gtin_prefixes').select('prefix').eq('brand_id', produsenId).maybeSingle();
    if (!prefixData) {
      await supabase.from('brand_gtin_prefixes').insert([{ brand_id: produsenId, prefix: '899123', is_active: true }]);
    }

    console.log('3. Creating Products & Instances...');
    const prod1 = await ProductService.createProduct(produsenId, {
      product_name: 'Produk Serial 1',
      category: 'Plastik',
      weight_grams: 50,
    });
    const prod2 = await ProductService.createProduct(produsenId, {
      product_name: 'Produk Serial 2',
      category: 'Kertas',
      weight_grams: 20,
    });
    const prod3 = await ProductService.createProduct(produsenId, {
      product_name: 'Produk Batch (100 item)',
      category: 'Kaca',
      weight_grams: 200,
    });

    // 2 Serial
    const instSerial1 = await ProductService.createInstance(prod1.gtin, produsenId, {
      identification_type: 'UNIQUE',
      identity_number: 1001
    });
    const instSerial2 = await ProductService.createInstance(prod2.gtin, produsenId, {
      identification_type: 'UNIQUE',
      identity_number: 1002
    });

    // 1 Batch with 100 instances
    const instBatch = await ProductService.createInstance(prod3.gtin, produsenId, {
      identification_type: 'BATCH',
      identity_number: 9001,
      quantity: 100
    });

    console.log('4. Simulating EPCIS Flow (Discard -> Collect -> Inspect -> Recycle)...');
    
    // We will simulate the flow for the 3 items (instSerial1, instSerial2, instBatch's first item)
    const instancesToSimulate = [
      instSerial1.instance.id,
      instSerial2.instance.id,
      instBatch.instance.id // 1 item from the batch of 100
    ];

    const tps1Coords = { lat: -6.1944, lng: 106.8229 };
    const tps2Coords = { lat: -6.2944, lng: 106.8229 };

    for (const instId of instancesToSimulate) {
      // 1. Discarding by Konsumen (Puts it in their wallet)
      await InstancesService.recordScan(instId, konsumenId, 'discarding', {
        location_name: 'Rumah Konsumen',
        coordinates: tps1Coords
      });

      // 2. Collecting by Petugas 1 (TPS 1)
      await InstancesService.recordScan(instId, petugas1Id, 'collecting', {
        location_name: 'TPS3R Demo 1',
        coordinates: tps1Coords
      });

      // 3. Receiving by Petugas 2 (TPS 2)
      await InstancesService.recordScan(instId, petugas2Id, 'receiving', {
        location_name: 'TPS3R Demo 2',
        coordinates: tps2Coords
      });

      // 4. Inspecting by Petugas 2 (TPS 2)
      await InstancesService.recordScan(instId, petugas2Id, 'inspecting', {
        location_name: 'TPS3R Demo 2',
        coordinates: tps2Coords
      });

      // 5. Recycling by Petugas 1 (TPS 1)
      await InstancesService.recordScan(instId, petugas1Id, 'recycling', {
        location_name: 'TPS3R Demo 1',
        coordinates: tps1Coords
      });
    }

    console.log('✅ Seeding Completed Successfully!');
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
  }
};

runSeed();
