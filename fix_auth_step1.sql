-- ============================================================
-- NUCLEAR CLEANUP: Hapus semua data seeder lalu buat ulang via API
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Urutan: tabel terdalam → terluar (ikuti dependency graph)

-- 1. point_history (depends on: activities, profiles)
DELETE FROM public.point_history WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);

-- 2. user_collections (depends on: profiles, product_instances)
DELETE FROM public.user_collections WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);

-- 3. activities (depends on: profiles via actor_id, product_instances via instance_id)
--    Hapus SEMUA activities yang melibatkan user-user ini
DELETE FROM public.activities WHERE actor_id IN (
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);
--    Hapus activities yang terkait produk milik produsen
DELETE FROM public.activities WHERE instance_id IN (
    SELECT pi.id FROM public.product_instances pi
    JOIN public.products p ON pi.product_id = p.id
    WHERE p.brand_id = '33333333-3333-3333-3333-333333333333'
);

-- 4. product_instances (depends on: products)
DELETE FROM public.product_instances WHERE product_id IN (
    SELECT id FROM public.products WHERE brand_id = '33333333-3333-3333-3333-333333333333'
);

-- 5. products (depends on: profiles via brand_id)
DELETE FROM public.products WHERE brand_id = '33333333-3333-3333-3333-333333333333';

-- 6. auth.identities (depends on: auth.users)
DELETE FROM auth.identities WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);

-- 7. profiles (depends on: auth.users) — sekarang aman karena activities sudah dihapus
DELETE FROM public.profiles WHERE id IN (
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);

-- 8. auth.users — terakhir
DELETE FROM auth.users WHERE id IN (
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);

-- 9. Cleanup by email juga (jika ada duplikat)
DELETE FROM public.point_history WHERE user_id IN (SELECT id FROM public.profiles WHERE email IN ('konsumen@gmail.com','petugas@gmail.com','produsen@gmail.com'));
DELETE FROM public.user_collections WHERE user_id IN (SELECT id FROM public.profiles WHERE email IN ('konsumen@gmail.com','petugas@gmail.com','produsen@gmail.com'));
DELETE FROM public.activities WHERE actor_id IN (SELECT id FROM public.profiles WHERE email IN ('konsumen@gmail.com','petugas@gmail.com','produsen@gmail.com'));
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('konsumen@gmail.com','petugas@gmail.com','produsen@gmail.com'));
DELETE FROM public.profiles WHERE email IN ('konsumen@gmail.com','petugas@gmail.com','produsen@gmail.com');
DELETE FROM auth.users WHERE email IN ('konsumen@gmail.com','petugas@gmail.com','produsen@gmail.com');

-- Verifikasi
SELECT count(*) as remaining_users FROM auth.users 
WHERE email IN ('konsumen@gmail.com', 'petugas@gmail.com', 'produsen@gmail.com');
