-- ============================================================
-- FIX AUTH: Drop ALL triggers on auth.users, then reseed users
-- Jalankan ini di Supabase SQL Editor SEBELUM seeder utama
-- ============================================================

-- 1. Drop ALL custom triggers on auth.users (not just on_auth_user_created)
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT tgname::text as trigger_name
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Dropping trigger: %', trigger_rec.trigger_name;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_rec.trigger_name);
    END LOOP;
END $$;

-- 2. Drop common handler functions that triggers reference
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

-- 3. Verify: list remaining triggers (should be empty or only internal ones)
SELECT tgname, tgtype FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
