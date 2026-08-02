-- 004_atomic_early_access_claim.sql
-- Fixes the early-access counter race: /api/onboarding/init and the
-- handle_new_user trigger both did read-count → compare → update in three
-- separate steps, so two concurrent signups could each read count=19, both
-- get an early-access slot, and one increment could be lost. The trigger
-- and the API fallback could also race EACH OTHER for the same user and
-- burn two slots.
--
-- Fix: all provisioning goes through one SQL function.
--   * claim_early_access_slot() claims a slot in a single UPDATE — the row
--     lock on the counter row serializes concurrent claims and the WHERE
--     clause re-checks the limit under that lock.
--   * provision_business_settings() serializes per-user via an advisory
--     xact lock, so trigger + API fallback for the same user can never
--     both claim.
--
-- Run in the Supabase SQL Editor.

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_early_access_slot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit     int;
  v_new_count int;
BEGIN
  SELECT COALESCE(value::int, 0) INTO v_limit
  FROM app_config WHERE key = 'early_access_limit';

  IF v_limit IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'spots_left', 0);
  END IF;

  UPDATE app_config
  SET value = (COALESCE(value::int, 0) + 1)::text
  WHERE key = 'early_access_count'
    AND COALESCE(value::int, 0) < v_limit
  RETURNING value::int INTO v_new_count;

  IF v_new_count IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'spots_left', 0);
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'spots_left', GREATEST(v_limit - v_new_count, 0)
  );
EXCEPTION WHEN OTHERS THEN
  -- app_config missing/broken → no early access, never block signup
  RETURN jsonb_build_object('claimed', false, 'spots_left', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_business_settings(
  p_user_id uuid,
  p_email   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim jsonb;
  v_early boolean;
BEGIN
  -- Serialize concurrent provisioning attempts for the same user
  -- (auth trigger vs /api/onboarding/init fallback).
  PERFORM pg_advisory_xact_lock(hashtext('provision:' || p_user_id::text));

  IF EXISTS (SELECT 1 FROM business_settings WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('status', 'already_initialized');
  END IF;

  v_claim := public.claim_early_access_slot();
  v_early := COALESCE((v_claim->>'claimed')::boolean, false);

  INSERT INTO business_settings (
    user_id, email, plan, plan_expires_at,
    reminders_enabled, lead_recovery_enabled, campaigns_enabled, created_at
  ) VALUES (
    p_user_id,
    p_email,
    CASE WHEN v_early THEN 'starter' ELSE 'trial' END,
    now() + CASE WHEN v_early THEN interval '30 days' ELSE interval '14 days' END,
    false, false, false, now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'status',       'ok',
    'plan',         CASE WHEN v_early THEN 'starter' ELSE 'trial' END,
    'early_access', v_early,
    'spots_left',   COALESCE((v_claim->>'spots_left')::int, 0)
  );
END;
$$;

-- Rebuild the auth trigger on top of the shared function so both
-- provisioning paths use the same race-free implementation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.provision_business_settings(NEW.id, NEW.email);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let provisioning failure block the signup itself; the client
  -- fallback (/api/onboarding/init) will retry row creation.
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

COMMIT;
