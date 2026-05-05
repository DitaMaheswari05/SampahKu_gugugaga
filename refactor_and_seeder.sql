-- 1. REFACTOR DATABASE SCHEMA (SUDAH DIJALANKAN)
/*
-- Drop constraint from product_instances
ALTER TABLE IF EXISTS product_instances DROP CONSTRAINT IF EXISTS product_instances_gtin_fkey;

-- Drop primary key from products 
ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_pkey CASCADE;

-- Add UUID primary key to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() PRIMARY KEY;

-- Add product_id to product_instances
ALTER TABLE product_instances ADD COLUMN IF NOT EXISTS product_id uuid;

-- Update existing data
UPDATE product_instances pi SET product_id = p.id FROM products p WHERE p.gtin = pi.gtin;

-- Hapus gtin dari product_instances karena sekarang pakai product_id
ALTER TABLE product_instances DROP COLUMN IF EXISTS gtin;

-- Tambah foreign key ke product_id
ALTER TABLE product_instances ADD CONSTRAINT product_instances_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
*/

-- 2. SEEDER DATA
-- HAPUS TRIGGER AUTH SECARA PAKSA AGAR TIDAK ERROR
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    konsumen_id uuid := '11111111-1111-1111-1111-111111111111';
    petugas_id uuid := '22222222-2222-2222-2222-222222222222';
    produsen_id uuid := '33333333-3333-3333-3333-333333333333';
    
    prod_id uuid;
    inst_id uuid;
    i int;
    j int;
    k int;
    is_high_value boolean;
    batch_str text;
BEGIN
    -- Bersihkan data relasi terlebih dahulu agar tidak error foreign key
    DELETE FROM public.activities WHERE actor_id IN (konsumen_id, petugas_id, produsen_id);
    DELETE FROM public.activities WHERE instance_id IN (
        SELECT id FROM public.product_instances WHERE product_id IN (
            SELECT id FROM public.products WHERE brand_id = produsen_id
        )
    );
    DELETE FROM public.product_instances WHERE product_id IN (
        SELECT id FROM public.products WHERE brand_id = produsen_id
    );
    DELETE FROM public.products WHERE brand_id = produsen_id;

    -- Bersihkan data auth
    DELETE FROM public.profiles WHERE id IN (konsumen_id, petugas_id, produsen_id);
    DELETE FROM auth.users WHERE id IN (konsumen_id, petugas_id, produsen_id);

    -- Insert ke auth.users
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
    (konsumen_id, 'authenticated', 'authenticated', 'konsumen@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"KONSUMEN"}', now(), now()),
    (petugas_id, 'authenticated', 'authenticated', 'petugas@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"PETUGAS"}', now(), now()),
    (produsen_id, 'authenticated', 'authenticated', 'produsen@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"BRAND"}', now(), now());

    -- Supabase GoTrue membutuhkan auth.identities agar login dengan email berhasil
    DELETE FROM auth.identities WHERE user_id IN (konsumen_id, petugas_id, produsen_id);
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    VALUES
    (gen_random_uuid(), konsumen_id, format('{"sub":"%s","email":"%s","email_verified":true}', konsumen_id::text, 'konsumen@gmail.com')::jsonb, 'email', konsumen_id, now(), now()),
    (gen_random_uuid(), petugas_id, format('{"sub":"%s","email":"%s","email_verified":true}', petugas_id::text, 'petugas@gmail.com')::jsonb, 'email', petugas_id, now(), now()),
    (gen_random_uuid(), produsen_id, format('{"sub":"%s","email":"%s","email_verified":true}', produsen_id::text, 'produsen@gmail.com')::jsonb, 'email', produsen_id, now(), now());

    -- Insert ke profiles
    INSERT INTO public.profiles (id, email, name, role, points, created_at)
    VALUES 
    (konsumen_id, 'konsumen@gmail.com', 'Akun Konsumen', 'KONSUMEN', 0, now()),
    (petugas_id, 'petugas@gmail.com', 'Akun Petugas', 'PETUGAS', 0, now()),
    (produsen_id, 'produsen@gmail.com', 'Akun Produsen', 'BRAND', 0, now());

    -- Generate 20 Products untuk Produsen
    FOR i IN 1..20 LOOP
        prod_id := gen_random_uuid();
        is_high_value := (i % 2 = 0); -- Genap = High Value (Serial), Ganjil = Low Value (Batch)
        
        INSERT INTO public.products (id, gtin, brand_id, product_name, material_passport, category, weight_grams, created_at)
        VALUES (
            prod_id,
            '89999990000' || LPAD(i::text, 3, '0'),
            produsen_id,
            'Produk ' || CASE WHEN is_high_value THEN 'High Value' ELSE 'Low Value' END || ' ' || i,
            '{"@context":"https://schema.org/","@type":"Product","material":[{"name":"Plastik","percentage":100,"recyclable":true}],"recyclingInstructions":"Cuci bersih"}'::jsonb,
            CASE WHEN is_high_value THEN 'Elektronik' ELSE 'Plastik' END,
            100 + (i * 10),
            now()
        );

        -- Generate ~100 instances per product
        IF is_high_value THEN
            -- UNIQUE / SERIAL instances
            FOR j IN 1..100 LOOP
                inst_id := gen_random_uuid();
                INSERT INTO public.product_instances (id, product_id, identification_type, serial_number, current_status, last_updated)
                VALUES (
                    inst_id, prod_id, 'UNIQUE', 'SN-' || LPAD(j::text, 4, '0'), 'IN_MARKET', now()
                );
                
                -- Sebagian masuk ke wallet konsumen
                IF j <= 10 THEN
                    UPDATE public.product_instances SET current_status = 'DISCARDED' WHERE id = inst_id;
                    INSERT INTO public.activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
                    VALUES (gen_random_uuid(), inst_id, konsumen_id, 'ObjectEvent', 'discarding', 'Rumah Konsumen', now());
                    
                    -- Lanjut ke proses selanjutnya untuk beberapa instance (simulasi perjalanan)
                    IF j <= 5 THEN
                        UPDATE public.product_instances SET current_status = 'PICKED_UP' WHERE id = inst_id;
                        INSERT INTO public.activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
                        VALUES (gen_random_uuid(), inst_id, petugas_id, 'ObjectEvent', 'collecting', 'Titik Kumpul', now() + interval '1 hour');
                    END IF;
                END IF;
            END LOOP;
        ELSE
            -- BATCH instances
            FOR j IN 1..100 LOOP
                inst_id := gen_random_uuid();
                INSERT INTO public.product_instances (id, product_id, identification_type, batch_number, current_status, last_updated)
                VALUES (
                    inst_id, prod_id, 'BATCH', 'BATCH-' || LPAD(j::text, 4, '0'), 'IN_MARKET', now()
                );
                
                -- Untuk Batch, 1 instance (1 QR batch) bisa di-scan banyak orang
                -- Simulasi beberapa konsumen membuang barang dari batch yang sama
                IF j <= 5 THEN
                    FOR k IN 1..20 LOOP
                        INSERT INTO public.activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
                        VALUES (gen_random_uuid(), inst_id, konsumen_id, 'ObjectEvent', 'discarding', 'Rumah Konsumen', now() - (k * interval '1 minute'));
                    END LOOP;

                    -- Simulasi petugas memproses sebagian dari batch tersebut
                    FOR k IN 1..15 LOOP
                        INSERT INTO public.activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
                        VALUES (gen_random_uuid(), inst_id, petugas_id, 'ObjectEvent', 'collecting', 'Titik Kumpul', now() + interval '1 hour');
                    END LOOP;

                    FOR k IN 1..10 LOOP
                        INSERT INTO public.activities (id, instance_id, actor_id, event_type, biz_step, location_name, timestamp)
                        VALUES (gen_random_uuid(), inst_id, petugas_id, 'ObjectEvent', 'receiving', 'TPS', now() + interval '2 hours');
                    END LOOP;
                    
                    -- Status batch tidak sepenuhnya relevan dengan status 1 item, tapi kita set status terakhir
                    UPDATE public.product_instances SET current_status = 'AT_TPS' WHERE id = inst_id;
                END IF;
            END LOOP;
        END IF;

    END LOOP;
END $$;
