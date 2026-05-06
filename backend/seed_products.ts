import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { ProductService } from './src/services/product.service';
import { InstancesService } from './src/services/instances.service';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function seedProducts() {
  console.log('Fetching users...');
  const { data: produsen } = await supabase.from('profiles').select('id, gtin_prefix').eq('email', 'produsen@gmail.com').single();
  const { data: petugas } = await supabase.from('profiles').select('id').eq('email', 'petugas@gmail.com').single();
  const { data: konsumen } = await supabase.from('profiles').select('id').eq('email', 'konsumen@gmail.com').single();

  if (!produsen || !petugas || !konsumen) {
    console.error('Missing required users! Please run fix_users.ts first.');
    return;
  }

  if (!produsen.gtin_prefix) {
    console.error('Produsen missing gtin_prefix. Setting default to 899129...');
    await supabase.from('profiles').update({ gtin_prefix: '899129' }).eq('id', produsen.id);
    produsen.gtin_prefix = '899129';
  }

  console.log('0. Clearing existing data...');
  // Delete in reverse order of dependencies to avoid FK constraint errors
  await supabase.from('point_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('product_instances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('1. Creating Products...');
  const highValueCategories = ['Elektronik', 'Elektronik', 'Logam', 'Logam', 'Kaca', 'Kaca', 'Lainnya'];
  const lowValueCategories = ['Plastik PET', 'Plastik PP', 'Kertas'];
  
  const products: any[] = [];
  
  for (let i = 0; i < 7; i++) {
    const p = await ProductService.createProduct(produsen.id, {
      sku: `HV-TEST-${i+1}`,
      product_name: `Produk Premium ${i+1}`,
      category: highValueCategories[i],
      weight_grams: 500 + i * 100,
    });
    products.push({ ...p, type: 'HV' });
    console.log(`Created HV Product: ${p.sku}`);
  }

  for (let i = 0; i < 3; i++) {
    const p = await ProductService.createProduct(produsen.id, {
      sku: `LV-TEST-${i+1}`,
      product_name: `Produk Massal ${i+1}`,
      category: lowValueCategories[i],
      weight_grams: 50 + i * 10,
    });
    products.push({ ...p, type: 'LV' });
    console.log(`Created LV Product: ${p.sku}`);
  }

  console.log('2 & 3. Creating Instances...');
  const allInstances: any[] = [];
  
  for (const p of products) {
    if (p.type === 'HV') {
      for (let j = 0; j < 5; j++) {
        const inst = await ProductService.createInstance(p.gtin, produsen.id, {
          identification_type: 'UNIQUE',
          serial_number: `SN-${p.sku}-${j+1}`
        });
        allInstances.push({ ...inst.instance, type: 'HV', product: p });
      }
    } else {
      const inst = await ProductService.createInstance(p.gtin, produsen.id, {
        identification_type: 'BATCH',
        batch_number: `BATCH-${p.sku}`,
        quantity: 10
      });
      allInstances.push(...inst.instances.map((i: any) => ({ ...i, type: 'LV', product: p })));
    }
  }
  console.log(`Created ${allInstances.length} total instances (physical items).`);

  console.log('4, 5, 6. Simulating Journeys...');
  
  const hvInstances = allInstances.filter(i => i.type === 'HV');
  const lvInstances = allInstances.filter(i => i.type === 'LV');

  // Assign specific instances to konsumen
  const konsumenSerial = hvInstances[0]; // 1 serial for konsumen
  const konsumenBatch1 = lvInstances[0]; // batch instance 1 for konsumen
  const konsumenBatch2 = lvInstances[1]; // batch instance 2 for konsumen

  const others = allInstances.filter(i => i.id !== konsumenSerial.id && i.id !== konsumenBatch1.id && i.id !== konsumenBatch2.id);

  async function processJourney(instance: any, isKonsumen: boolean, steps: string[]) {
    for (const step of steps) {
      let actor = petugas!.id;
      if (step === 'discarding') {
        // First history "discarded" done by Konsumen if isKonsumen=true
        actor = isKonsumen ? konsumen!.id : petugas!.id;
      }
      
      try {
        if (step === 'inspecting') {
          await InstancesService.recordScan(instance.id, actor, 'inspecting', { material_type: instance.product.category });
        } else if (step === 'receiving') {
          await InstancesService.recordScan(instance.id, actor, 'receiving', { location_name: 'Fasilitas Test' });
        } else {
          await InstancesService.recordScan(instance.id, actor, step);
        }
      } catch (e: any) {
        // Ignore duplicate status errors if they happen, but generally they shouldn't
        console.error(`Error on step ${step} for ${instance.id}: ${e.message}`);
      }
    }
  }

  // Full journey: most processes
  const fullJourney = ['discarding', 'collecting', 'receiving', 'inspecting', 'shipping', 'receiving', 'recycling'];
  const partialJourney = ['discarding', 'collecting', 'receiving', 'inspecting'];
  
  console.log('Processing specific Konsumen instances...');
  await processJourney(konsumenSerial, true, fullJourney);
  console.log(`   Processed Serial ${konsumenSerial.id} (Full Journey)`);
  
  await processJourney(konsumenBatch1, true, partialJourney);
  await processJourney(konsumenBatch2, true, partialJourney);
  console.log(`   Processed 2 Batch instances (Partial Journey)`);

  console.log('Processing other instances with random journeys...');
  const journeys = [
    [], // IN_MARKET
    ['discarding'],
    ['discarding', 'collecting'],
    ['discarding', 'collecting', 'receiving'],
    ['discarding', 'collecting', 'receiving', 'inspecting'],
    ['discarding', 'collecting', 'receiving', 'inspecting', 'shipping', 'receiving', 'disposing'],
    fullJourney
  ];

  let count = 0;
  for (const inst of others) {
    const randomJourney = journeys[Math.floor(Math.random() * journeys.length)];
    if (randomJourney.length > 0) {
       await processJourney(inst, false, randomJourney);
    }
    count++;
    if (count % 10 === 0) console.log(`   ...processed ${count}/${others.length} instances`);
  }

  console.log('Done seeding products and journeys!');
}

seedProducts().catch(console.error);
