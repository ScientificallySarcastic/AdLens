-- 001_enable_rls.sql
-- Enables Row Level Security on all application tables.
-- Run this in your Supabase SQL Editor. Review policies before running.
--
-- IMPORTANT: service_role_key bypasses RLS. These policies only affect
-- anon-key and user-token access (i.e. client-side queries).

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. business_settings
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business_settings"
  ON business_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own business_settings"
  ON business_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business_settings"
  ON business_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. whatsapp_connections
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp_connections"
  ON whatsapp_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp_connections"
  ON whatsapp_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp_connections"
  ON whatsapp_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. services
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services"
  ON services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON services FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. messages
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. conversations
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. customers
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 7. bookings
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. leads
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 9. campaigns
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. campaign_optouts
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE campaign_optouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign_optouts"
  ON campaign_optouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign_optouts"
  ON campaign_optouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 11. sequences
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequences"
  ON sequences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sequences"
  ON sequences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sequences"
  ON sequences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sequences"
  ON sequences FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 12. sequence_enrollments
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequence_enrollments"
  ON sequence_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sequence_enrollments"
  ON sequence_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sequence_enrollments"
  ON sequence_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 13. business_knowledge
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE business_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business_knowledge"
  ON business_knowledge FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business_knowledge"
  ON business_knowledge FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business_knowledge"
  ON business_knowledge FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 14. ai_event_log
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE ai_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_event_log"
  ON ai_event_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_event_log"
  ON ai_event_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 15. app_config — admin-only, no user access via anon key
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- No policies = no anon/user access. Only service_role_key can read/write.

COMMIT;
