-- ============================================================================
-- ScholarBridge — Data integrity & operations upgrade (spec §4-§11, §16, §20)
-- ============================================================================
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Quyidagi SQL'ni qo'ying va "Run" bosing
--   (yoki Render deploy qilsangiz — build'dagi `npm run db:push` buni avtomatik
--    qiladi; bu fayl qo'lda/qo'shimcha nazorat uchun)
--
-- Xavfsiz: ADD COLUMN IF NOT EXISTS — qayta ishga tushirish mumkin.
-- ============================================================================

-- 1) universities — source verification
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamp,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source_reliability integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) scholarships — dynamic lifecycle + verification
ALTER TABLE scholarships
  ADD COLUMN IF NOT EXISTS eligible_countries text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS funding_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tuition_coverage text DEFAULT '',
  ADD COLUMN IF NOT EXISTS living_allowance integer,
  ADD COLUMN IF NOT EXISTS travel_allowance integer,
  ADD COLUMN IF NOT EXISTS accommodation text DEFAULT '',
  ADD COLUMN IF NOT EXISTS application_fee integer,
  ADD COLUMN IF NOT EXISTS english_requirements text DEFAULT '',
  ADD COLUMN IF NOT EXISTS required_documents text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS opening_date date,
  ADD COLUMN IF NOT EXISTS deadline_date date,
  ADD COLUMN IF NOT EXISTS deadline_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS deadline_range_start date,
  ADD COLUMN IF NOT EXISTS deadline_range_end date,
  ADD COLUMN IF NOT EXISTS rounds text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS expected_opening_period text,
  ADD COLUMN IF NOT EXISTS expected_deadline_period text,
  ADD COLUMN IF NOT EXISTS application_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamp,
  ADD COLUMN IF NOT EXISTS last_updated_at timestamp,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source_reliability integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3) New tables
CREATE TABLE IF NOT EXISTS app_config (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id integer NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  source text,
  actor text NOT NULL DEFAULT 'ADMIN',
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_jobs (
  id serial PRIMARY KEY,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  trigger text NOT NULL DEFAULT 'manual',
  items_processed integer NOT NULL DEFAULT 0,
  items_changed integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamp,
  finished_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  profile_id integer REFERENCES student_profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id serial PRIMARY KEY,
  profile_id integer REFERENCES student_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  push boolean NOT NULL DEFAULT false,
  types text NOT NULL DEFAULT '["scholarship_opened","deadline_approaching","deadline_changed","milestone_due"]',
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id serial PRIMARY KEY,
  profile_id integer REFERENCES student_profiles(id) ON DELETE SET NULL,
  task_type text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cost_estimate double precision NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_documents (
  id serial PRIMARY KEY,
  profile_id integer REFERENCES student_profiles(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL,
  entity_id integer,
  document_type text NOT NULL,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'missing',
  file_url text,
  deadline_date date,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- 4) Seed default config values (spec §3 — no hardcoded data in code)
INSERT INTO app_config (key, value, description) VALUES
  ('payment_premium_price_uzs', '59000', 'Premium narxi (UZS)'),
  ('payment_premium_days', '30', 'Premium muddati (kun)'),
  ('payment_currency', 'UZS', 'To''lov valyutasi'),
  ('ai_free_requests_per_day', '5', 'Free foydalanuvchi uchun kunlik AI so''rovlar'),
  ('ai_premium_requests_per_day', '50', 'Premium foydalanuvchi uchun kunlik AI so''rovlar'),
  ('refresh_interval_hours', '24', 'Avtomatik yangilash oralig''i (soat)'),
  ('refresh_default_scope', 'all', 'Default refresh scope'),
  ('referral_premium_multiple', '5', 'Referal premium uchun ballar'),
  ('referral_premium_days', '30', 'Referal premium muddati')
ON CONFLICT (key) DO NOTHING;

-- 5) Backfill: existing scholarships get lifecycle defaults from legacy deadline text
UPDATE scholarships
SET deadline_date = NULLIF(deadline, '')::date,
    deadline_type = CASE WHEN NULLIF(deadline, '') IS NOT NULL THEN 'exact' ELSE 'unknown' END,
    recurrence = 'annual',
    expected_deadline_period = NULLIF(deadline, ''),
    source_url = website_url,
    verification_status = 'unverified'
WHERE deadline_date IS NULL AND NULLIF(deadline, '') IS NOT NULL;
