-- 003_unique_constraints_for_upserts.sql
-- Every upsert(..., { onConflict: ... }) in the codebase needs a matching
-- UNIQUE constraint, or Postgres rejects the write. Several call sites
-- swallow the error (customer-engine, saveAI), so a missing constraint
-- means silently lost data. This makes all of them exist, idempotently.
--
--   customers            (user_id, phone)         lib/crm/customer-engine.js
--   campaign_optouts     (user_id, phone)         lib/crm/customer-engine.js
--   sequence_enrollments (sequence_id, lead_phone) lib/sequences + dashboard
--   whatsapp_connections (user_id)                 app/api/meta/callback
--   business_knowledge   (user_id, category)       dashboard settings
--
-- Run in the Supabase SQL Editor after 002.

BEGIN;

-- business_knowledge is upserted with category "business_info", but the
-- live table was missing the column entirely — add it before constraining.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_knowledge')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'business_knowledge' AND column_name = 'category'
     )
  THEN
    ALTER TABLE business_knowledge ADD COLUMN category text NOT NULL DEFAULT 'business_info';
  END IF;
END $$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('customers',            'customers_user_id_phone_key',            'user_id, phone'),
      ('campaign_optouts',     'campaign_optouts_user_id_phone_key',     'user_id, phone'),
      ('sequence_enrollments', 'sequence_enrollments_seq_phone_key',     'sequence_id, lead_phone'),
      ('whatsapp_connections', 'whatsapp_connections_user_id_key',       'user_id'),
      ('business_knowledge',   'business_knowledge_user_id_category_key','user_id, category')
    ) AS v(tbl, con, cols)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t.tbl)
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t.con)
    THEN
      -- Remove duplicates that would block the constraint, keeping one row
      EXECUTE format(
        'DELETE FROM %I a USING %I b WHERE a.ctid < b.ctid AND (%s)',
        t.tbl, t.tbl,
        (SELECT string_agg(format('a.%I = b.%I', c, c), ' AND ')
         FROM unnest(string_to_array(replace(t.cols, ' ', ''), ',')) AS c)
      );
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (%s)', t.tbl, t.con, t.cols);
    END IF;
  END LOOP;
END $$;

COMMIT;
