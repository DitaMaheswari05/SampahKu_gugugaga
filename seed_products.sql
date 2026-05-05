-- ============================================================
-- SEEDER: 10 Produk + Instances + Wallet + Points
-- Jalankan di Supabase SQL Editor SETELAH fix_users.ts
-- ============================================================

DO $$
DECLARE
    v_konsumen uuid;
    v_petugas uuid;
    v_produsen uuid;
    
    -- Product IDs
    pid uuid;
    pids uuid[];
    
    -- Instance + Activity helpers
    iid uuid;
    aid uuid;
    
    -- Points tracking
    pts_petugas int := 0;
    pts_konsumen int := 0;
    
    -- Point constants (match backend/src/constants.ts)
    PT_DISCARDED  int := 1;
    PT_PICKED_UP  int := 2;
    PT_AT_TPS     int := 3;
    PT_SORTED     int := 4;
    PT_IN_TRANSIT int := 2;
    PT_AT_FACILITY int := 5;
    PT_RECYCLED   int := 10;
    PT_DISPOSED   int := 1;
    
    i int;
    depth int;
    
    -- Journey steps arrays
    steps text[];
    step_statuses text[];
    step_locations text[];
    step_facilities text[];
    step_points int[];
    
BEGIN
    -- ==========================================
    -- LOOKUP USERS
    -- ==========================================
    SELECT id INTO v_konsumen FROM profiles WHERE email = 'konsumen@gmail.com';
    SELECT id INTO v_petugas FROM profiles WHERE email = 'petugas@gmail.com';
    SELECT id INTO v_produsen FROM profiles WHERE email = 'produsen@gmail.com';
    
    IF v_konsumen IS NULL OR v_petugas IS NULL OR v_produsen IS NULL THEN
        RAISE EXCEPTION 'Users not found! Run fix_users.ts first.';
    END IF;
    
    -- Journey steps (petugas does all of these)
    steps          := ARRAY['collecting',   'receiving',           'inspecting',          'shipping',        'receiving',              'recycling'];
    step_statuses  := ARRAY['PICKED_UP',    'AT_TPS',              'SORTED',              'IN_TRANSIT',      'AT_FACILITY',            'RECYCLED'];
    step_locations := ARRAY['Titik Kumpul RT 05', 'TPS Kelurahan Menteng', 'TPS Kelurahan Menteng', 'Truk DLH Jakarta', 'Bank Sampah Sejahtera', 'Bank Sampah Sejahtera'];
    step_facilities:= ARRAY[NULL,           'TPS',                 'TPS',                 NULL,              'BANK_SAMPAH',            'RECYCLER'];
    step_points    := ARRAY[PT_PICKED_UP,   PT_AT_TPS,             PT_SORTED,             PT_IN_TRANSIT,     PT_AT_FACILITY,           PT_RECYCLED];
    
    -- ==========================================
    -- CLEANUP OLD DATA
    -- ==========================================
    DELETE FROM public.point_history WHERE activity_id IN (
        SELECT a.id FROM public.activities a
        JOIN public.product_instances pi ON a.instance_id = pi.id
        JOIN public.products p ON pi.product_id = p.id
        WHERE p.brand_id = v_produsen
    );
    DELETE FROM public.point_history WHERE user_id IN (v_konsumen, v_petugas);
    DELETE FROM public.user_collections WHERE instance_id IN (
        SELECT pi.id FROM public.product_instances pi
        JOIN public.products p ON pi.product_id = p.id WHERE p.brand_id = v_produsen
    );
    DELETE FROM public.activities WHERE instance_id IN (
        SELECT pi.id FROM public.product_instances pi
        JOIN public.products p ON pi.product_id = p.id WHERE p.brand_id = v_produsen
    );
    DELETE FROM public.activities WHERE actor_id IN (v_konsumen, v_petugas, v_produsen);
    DELETE FROM public.product_instances WHERE product_id IN (
        SELECT id FROM public.products WHERE brand_id = v_produsen
    );
    DELETE FROM public.products WHERE brand_id = v_produsen;
    
    -- Reset points
    UPDATE public.profiles SET points = 0 WHERE id IN (v_konsumen, v_petugas);

    -- ==========================================
    -- CREATE 10 PRODUCTS (3 BATCH + 7 SERIAL)
    -- ==========================================
    pids := ARRAY[]::uuid[];
    
    -- Product 1: BATCH - Botol Air Mineral 600ml
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000001', v_produsen, 'Botol Air Mineral 600ml',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"PET Plastic","percentage":90,"recyclable":true},{"name":"PP Cap","percentage":10,"recyclable":true}],"recyclingInstructions":"Cuci bersih, lepas tutup, buang ke bank sampah plastik"}'::jsonb,
        'Plastik', 25, now() - interval '30 days');

    -- Product 2: BATCH - Kantong Belanja Plastik
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000002', v_produsen, 'Kantong Belanja Plastik',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"HDPE Plastic","percentage":100,"recyclable":true}],"recyclingInstructions":"Kumpulkan dan setor ke bank sampah"}'::jsonb,
        'Plastik', 10, now() - interval '28 days');

    -- Product 3: BATCH - Gelas Plastik Party Pack
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000003', v_produsen, 'Gelas Plastik Party Pack',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"PS Plastic","percentage":100,"recyclable":false}],"recyclingInstructions":"Sulit didaur ulang, buang ke tempat sampah residu"}'::jsonb,
        'Plastik', 15, now() - interval '25 days');

    -- Product 4: SERIAL - Smartphone Case Premium
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000004', v_produsen, 'Smartphone Case Premium',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"TPU Plastic","percentage":60,"recyclable":true},{"name":"Polycarbonate","percentage":40,"recyclable":true}],"recyclingInstructions":"Bawa ke e-waste collection point"}'::jsonb,
        'Elektronik', 50, now() - interval '22 days');

    -- Product 5: SERIAL - Earphone Wireless Pro
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000005', v_produsen, 'Earphone Wireless Pro',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"ABS Plastic","percentage":50,"recyclable":true},{"name":"Lithium Battery","percentage":30,"recyclable":false},{"name":"Copper Wire","percentage":20,"recyclable":true}],"recyclingInstructions":"Bawa ke e-waste collection point, jangan buang ke sampah biasa"}'::jsonb,
        'Elektronik', 30, now() - interval '20 days');

    -- Product 6: SERIAL - Tablet 10 inch
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000006', v_produsen, 'Tablet 10 inch',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"Aluminum","percentage":40,"recyclable":true},{"name":"Glass","percentage":30,"recyclable":true},{"name":"Lithium Battery","percentage":30,"recyclable":false}],"recyclingInstructions":"Setor ke pusat daur ulang elektronik resmi"}'::jsonb,
        'Elektronik', 450, now() - interval '18 days');

    -- Product 7: SERIAL - Smartwatch Band
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000007', v_produsen, 'Smartwatch Band',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"Silicone","percentage":80,"recyclable":false},{"name":"Metal Buckle","percentage":20,"recyclable":true}],"recyclingInstructions":"Pisahkan buckle logam, silikon masuk residu"}'::jsonb,
        'Elektronik', 35, now() - interval '15 days');

    -- Product 8: SERIAL - Power Bank 10000mAh
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000008', v_produsen, 'Power Bank 10000mAh',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"Lithium Polymer","percentage":60,"recyclable":false},{"name":"ABS Casing","percentage":30,"recyclable":true},{"name":"PCB","percentage":10,"recyclable":true}],"recyclingInstructions":"WAJIB setor ke e-waste collection point. Jangan dibuang sembarangan."}'::jsonb,
        'Elektronik', 200, now() - interval '12 days');

    -- Product 9: SERIAL - Kabel USB-C Premium
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000009', v_produsen, 'Kabel USB-C Premium',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"Copper Wire","percentage":50,"recyclable":true},{"name":"PVC Insulation","percentage":40,"recyclable":false},{"name":"Metal Connectors","percentage":10,"recyclable":true}],"recyclingInstructions":"Potong konektor, pisahkan kabel tembaga"}'::jsonb,
        'Elektronik', 20, now() - interval '10 days');

    -- Product 10: SERIAL - Mouse Wireless Ergonomic
    pid := gen_random_uuid(); pids := pids || pid;
    INSERT INTO products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
    VALUES (pid, '8999999000010', v_produsen, 'Mouse Wireless Ergonomic',
        '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"ABS Plastic","percentage":60,"recyclable":true},{"name":"PCB","percentage":20,"recyclable":true},{"name":"AA Battery","percentage":20,"recyclable":false}],"recyclingInstructions":"Keluarkan baterai, pisahkan plastik dan PCB"}'::jsonb,
        'Elektronik', 80, now() - interval '7 days');

    -- ==========================================
    -- BATCH INSTANCES (Products 1-3, 10 each)
    -- Depth: how far along the journey
    --   0=IN_MARKET, 1=PICKED_UP, 2=AT_TPS, 3=SORTED,
    --   4=IN_TRANSIT, 5=AT_FACILITY, 6=RECYCLED
    --   Special: depth=-1 = DISPOSED path
    -- ==========================================
    FOR i IN 1..3 LOOP  -- For each batch product
        FOR depth IN 0..9 LOOP
            iid := gen_random_uuid();
            
            INSERT INTO product_instances (id, product_id, identification_type, batch_number, current_status, last_updated)
            VALUES (iid, pids[i], 'BATCH', 
                    'BATCH-' || LPAD(i::text, 2, '0') || '-' || LPAD((depth+1)::text, 2, '0'),
                    'IN_MARKET', now());
            
            IF depth = 0 THEN
                -- IN_MARKET, no activities
                CONTINUE;
            END IF;
            
            -- DISPOSED path (depth=9)
            IF depth = 9 THEN
                -- collecting → receiving → disposing
                FOR j IN 1..2 LOOP
                    aid := gen_random_uuid();
                    INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, facility_type, timestamp)
                    VALUES (aid, iid, v_petugas, 'ObjectEvent', steps[j], step_locations[j], step_facilities[j],
                            now() - interval '10 days' + (j * interval '4 hours'));
                    INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
                    VALUES (gen_random_uuid(), v_petugas, step_points[j], aid, 'Poin untuk ' || steps[j], now());
                    pts_petugas := pts_petugas + step_points[j];
                END LOOP;
                -- disposing
                aid := gen_random_uuid();
                INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, facility_type, timestamp)
                VALUES (aid, iid, v_petugas, 'ObjectEvent', 'disposing', 'TPA Bantar Gebang', 'TPA',
                        now() - interval '10 days' + interval '12 hours');
                INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
                VALUES (gen_random_uuid(), v_petugas, PT_DISPOSED, aid, 'Poin untuk disposing', now());
                pts_petugas := pts_petugas + PT_DISPOSED;
                UPDATE product_instances SET current_status = 'DISPOSED', last_updated = now() - interval '10 days' + interval '12 hours' WHERE id = iid;
                CONTINUE;
            END IF;
            
            -- Normal journey (depth 1-8 maps to steps 1-6, capped)
            FOR j IN 1..LEAST(depth, 6) LOOP
                aid := gen_random_uuid();
                INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, facility_type, timestamp)
                VALUES (aid, iid, v_petugas, 'ObjectEvent', steps[j], step_locations[j], step_facilities[j],
                        now() - interval '14 days' + (depth * interval '1 day') + (j * interval '3 hours'));
                INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
                VALUES (gen_random_uuid(), v_petugas, step_points[j], aid, 'Poin untuk ' || steps[j], now());
                pts_petugas := pts_petugas + step_points[j];
            END LOOP;
            
            -- Update status to latest stage
            IF depth <= 6 THEN
                UPDATE product_instances SET current_status = step_statuses[depth], 
                       last_updated = now() - interval '14 days' + (depth * interval '1 day') + (depth * interval '3 hours')
                WHERE id = iid;
            ELSE
                UPDATE product_instances SET current_status = step_statuses[6],
                       last_updated = now() - interval '7 days'
                WHERE id = iid;
            END IF;
        END LOOP;
    END LOOP;

    -- ==========================================
    -- SERIAL INSTANCES (Products 4-10, 5 each)
    -- depth 0=IN_MARKET, 1-6 same journey
    -- ==========================================
    FOR i IN 4..10 LOOP
        FOR depth IN 0..4 LOOP
            iid := gen_random_uuid();
            
            INSERT INTO product_instances (id, product_id, identification_type, serial_number, current_status, last_updated)
            VALUES (iid, pids[i], 'UNIQUE',
                    'SN-' || LPAD(i::text, 2, '0') || '-' || LPAD((depth+1)::text, 4, '0'),
                    'IN_MARKET', now());
            
            IF depth = 0 THEN CONTINUE; END IF;
            
            FOR j IN 1..LEAST(depth, 6) LOOP
                aid := gen_random_uuid();
                INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, facility_type, timestamp)
                VALUES (aid, iid, v_petugas, 'ObjectEvent', steps[j], step_locations[j], step_facilities[j],
                        now() - interval '10 days' + (depth * interval '1 day') + (j * interval '2 hours'));
                INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
                VALUES (gen_random_uuid(), v_petugas, step_points[j], aid, 'Poin untuk ' || steps[j], now());
                pts_petugas := pts_petugas + step_points[j];
            END LOOP;
            
            UPDATE product_instances SET current_status = step_statuses[LEAST(depth, 6)],
                   last_updated = now() - interval '10 days' + (depth * interval '1 day') + (depth * interval '2 hours')
            WHERE id = iid;
        END LOOP;
    END LOOP;

    -- ==========================================
    -- KONSUMEN WALLET (4 items discarded by konsumen)
    -- ==========================================
    
    -- Wallet Item 1: Smartphone Case (Product 4, SERIAL) → RECYCLED
    iid := gen_random_uuid();
    INSERT INTO product_instances (id, product_id, identification_type, serial_number, current_status, last_updated)
    VALUES (iid, pids[4], 'UNIQUE', 'SN-04-W001', 'IN_MARKET', now());
    -- Konsumen discards
    aid := gen_random_uuid();
    INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
    VALUES (aid, iid, v_konsumen, 'ObjectEvent', 'discarding', 'Rumah Konsumen, Jakarta Selatan', now() - interval '7 days');
    INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
    VALUES (gen_random_uuid(), v_konsumen, PT_DISCARDED, aid, 'Poin membuang sampah', now());
    pts_konsumen := pts_konsumen + PT_DISCARDED;
    -- Petugas full journey to RECYCLED
    FOR j IN 1..6 LOOP
        aid := gen_random_uuid();
        INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, facility_type, timestamp)
        VALUES (aid, iid, v_petugas, 'ObjectEvent', steps[j], step_locations[j], step_facilities[j],
                now() - interval '7 days' + (j * interval '6 hours'));
        INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
        VALUES (gen_random_uuid(), v_petugas, step_points[j], aid, 'Poin untuk ' || steps[j], now());
        pts_petugas := pts_petugas + step_points[j];
    END LOOP;
    UPDATE product_instances SET current_status = 'RECYCLED', last_updated = now() - interval '5 days' WHERE id = iid;

    -- Wallet Item 2: Botol Air Mineral (Product 1, BATCH) → SORTED
    iid := gen_random_uuid();
    INSERT INTO product_instances (id, product_id, identification_type, batch_number, current_status, last_updated)
    VALUES (iid, pids[1], 'BATCH', 'BATCH-01-W01', 'IN_MARKET', now());
    -- Konsumen discards
    aid := gen_random_uuid();
    INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
    VALUES (aid, iid, v_konsumen, 'ObjectEvent', 'discarding', 'Rumah Konsumen, Depok', now() - interval '5 days');
    INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
    VALUES (gen_random_uuid(), v_konsumen, PT_DISCARDED, aid, 'Poin membuang sampah', now());
    pts_konsumen := pts_konsumen + PT_DISCARDED;
    -- Petugas journey to SORTED (3 steps)
    FOR j IN 1..3 LOOP
        aid := gen_random_uuid();
        INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, facility_type, timestamp)
        VALUES (aid, iid, v_petugas, 'ObjectEvent', steps[j], step_locations[j], step_facilities[j],
                now() - interval '5 days' + (j * interval '5 hours'));
        INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
        VALUES (gen_random_uuid(), v_petugas, step_points[j], aid, 'Poin untuk ' || steps[j], now());
        pts_petugas := pts_petugas + step_points[j];
    END LOOP;
    UPDATE product_instances SET current_status = 'SORTED', last_updated = now() - interval '4 days' WHERE id = iid;

    -- Wallet Item 3: Earphone Wireless (Product 5, SERIAL) → SORTED
    iid := gen_random_uuid();
    INSERT INTO product_instances (id, product_id, identification_type, serial_number, current_status, last_updated)
    VALUES (iid, pids[5], 'UNIQUE', 'SN-05-W001', 'IN_MARKET', now());
    -- Konsumen discards
    aid := gen_random_uuid();
    INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
    VALUES (aid, iid, v_konsumen, 'ObjectEvent', 'discarding', 'Apartemen Konsumen, Tangerang', now() - interval '4 days');
    INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
    VALUES (gen_random_uuid(), v_konsumen, PT_DISCARDED, aid, 'Poin membuang sampah', now());
    pts_konsumen := pts_konsumen + PT_DISCARDED;
    -- Petugas journey to SORTED (3 steps)
    FOR j IN 1..3 LOOP
        aid := gen_random_uuid();
        INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, facility_type, timestamp)
        VALUES (aid, iid, v_petugas, 'ObjectEvent', steps[j], step_locations[j], step_facilities[j],
                now() - interval '4 days' + (j * interval '4 hours'));
        INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
        VALUES (gen_random_uuid(), v_petugas, step_points[j], aid, 'Poin untuk ' || steps[j], now());
        pts_petugas := pts_petugas + step_points[j];
    END LOOP;
    UPDATE product_instances SET current_status = 'SORTED', last_updated = now() - interval '3 days' WHERE id = iid;

    -- Wallet Item 4: Kantong Belanja (Product 2, BATCH) → DISCARDED
    iid := gen_random_uuid();
    INSERT INTO product_instances (id, product_id, identification_type, batch_number, current_status, last_updated)
    VALUES (iid, pids[2], 'BATCH', 'BATCH-02-W01', 'IN_MARKET', now());
    -- Konsumen discards (baru dibuang, belum diproses petugas)
    aid := gen_random_uuid();
    INSERT INTO activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
    VALUES (aid, iid, v_konsumen, 'ObjectEvent', 'discarding', 'Rumah Konsumen, Bekasi', now() - interval '1 day');
    INSERT INTO point_history (id, user_id, points_earned, activity_id, description, created_at)
    VALUES (gen_random_uuid(), v_konsumen, PT_DISCARDED, aid, 'Poin membuang sampah', now());
    pts_konsumen := pts_konsumen + PT_DISCARDED;
    UPDATE product_instances SET current_status = 'DISCARDED', last_updated = now() - interval '1 day' WHERE id = iid;

    -- ==========================================
    -- UPDATE TOTAL POINTS
    -- ==========================================
    UPDATE public.profiles SET points = pts_petugas WHERE id = v_petugas;
    UPDATE public.profiles SET points = pts_konsumen WHERE id = v_konsumen;
    
    RAISE NOTICE 'Seeder complete! Petugas points: %, Konsumen points: %', pts_petugas, pts_konsumen;
    RAISE NOTICE 'Products: 10 (3 batch + 7 serial)';
    RAISE NOTICE 'Batch instances: 30 (10 per product), Serial instances: 35 (5 per product) + 4 wallet = 39';
    RAISE NOTICE 'Wallet items: 4 (1 RECYCLED, 1 SORTED batch, 1 SORTED serial, 1 DISCARDED)';
END $$;
