-- 002_new_user_provisioning.sql
-- Fixes "new users' data is not stored in the DB".
--
-- Root causes addressed:
--   1. business_settings.user_id had no UNIQUE constraint, so every
--      upsert(..., { onConflict: "user_id" }) from /onboarding failed with
--      "no unique or exclusion constraint matching the ON CONFLICT
--      specification" — nothing the user typed during onboarding was saved.
--   2. Row creation depended entirely on the client calling
--      /api/onboarding/init after signup. If that fetch failed (network,
--      missing session after OTP verify, user closing the tab) the user
--      ended up with no business_settings row at all.
--
-- This migration makes provisioning server-side and unconditional:
-- a trigger on auth.users creates the row the moment the account exists.
--
-- Run in the Supabase SQL Editor.

BEGIN;

-- ── 1. Deduplicate any rows created before the constraint existed ──
DELETE FROM business_settings a
USING business_settings b
WHERE a.user_id = b.user_id
  AND a.ctid < b.ctid;

-- ── 2. Unique constraint so ON CONFLICT (user_id) works ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_settings_user_id_key'
  ) THEN
    ALTER TABLE business_settings
      ADD CONSTRAINT business_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ── 3. Auto-provision every new auth user ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count  int := 0;
  v_limit  int := 20;
  v_early  boolean;
BEGIN
  BEGIN
    SELECT COALESCE(value::int, 0)  INTO v_count FROM app_config WHERE key = 'early_access_count';
    SELECT COALESCE(value::int, 20) INTO v_limit FROM app_config WHERE key = 'early_access_limit';
  EXCEPTION WHEN OTHERS THEN
    v_count := 0; v_limit := 0; -- app_config missing/broken → plain trial
  END;
  v_early := COALESCE(v_count, 0) < COALESCE(v_limit, 0);

  INSERT INTO business_settings (
    user_id, email, plan, plan_expires_at,
    reminders_enabled, lead_recovery_enabled, campaigns_enabled, created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN v_early THEN 'starter' ELSE 'trial' END,
    now() + CASE WHEN v_early THEN interval '30 days' ELSE interval '14 days' END,
    false, false, false, now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_early THEN
    UPDATE app_config SET value = (v_count + 1)::text WHERE key = 'early_access_count';
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let provisioning failure block the signup itself; the client
  -- fallback (/api/onboarding/init) will retry row creation.
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Backfill existing auth users who never got a row ──
INSERT INTO business_settings (
  user_id, email, plan, plan_expires_at,
  reminders_enabled, lead_recovery_enabled, campaigns_enabled, created_at
)
SELECT u.id, u.email, 'trial', now() + interval '14 days',
       false, false, false, now()
FROM auth.users u
LEFT JOIN business_settings bs ON bs.user_id = u.id
WHERE bs.user_id IS NULL;

COMMIT;
