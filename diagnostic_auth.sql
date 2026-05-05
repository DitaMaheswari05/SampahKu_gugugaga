-- ============================================================
-- DIAGNOSTIK AUTH: Jalankan di SQL Editor Supabase
-- Copy SEMUA output/hasilnya dan share ke saya
-- ============================================================

-- 1. Cek SEMUA triggers pada auth.users (termasuk internal)
SELECT tgname, tgtype, tgenabled, 
       pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;

-- 2. Cek apakah user seeder sudah ada di auth.users
SELECT id, email, created_at, email_confirmed_at, 
       raw_app_meta_data, raw_user_meta_data,
       is_sso_user, deleted_at
FROM auth.users 
WHERE email IN ('konsumen@gmail.com', 'petugas@gmail.com', 'produsen@gmail.com')
   OR id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

-- 3. Cek auth.identities
SELECT id, user_id, provider, provider_id, created_at
FROM auth.identities 
WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

-- 4. Cek functions di public schema yang berpotensi jadi trigger handler
SELECT n.nspname as schema, p.proname as function_name, 
       pg_get_functiondef(p.oid) as definition
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND (p.proname ILIKE '%user%' OR p.proname ILIKE '%auth%' OR p.proname ILIKE '%profile%' OR p.proname ILIKE '%handle%');

-- 5. Cek RLS policies pada profiles (bisa jadi sumber error cascade)
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Cek schema auth.users - apakah ada kolom yang ditambahkan/diubah
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- 7. Cek apakah ada event triggers yang bisa mengganggu
SELECT evtname, evtevent, evtenabled
FROM pg_event_trigger;
