-- ============================================================================
-- SCHOLARBRIDGE — UNIVERSITY DISCOVERY UPGRADE (spec §15)
-- ============================================================================
-- Xavfsiz: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS — qayta
-- ishga tushirish mumkin. Render'da db:push ham buni qiladi, lekin bu fayl
-- qo'lda nazorat uchun.
-- ============================================================================

-- ---------- 1) universities — yangi ustunlar (NULL = verified emas) ----------
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS tuition_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS application_fee integer,
  ADD COLUMN IF NOT EXISTS application_fee_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS min_toefl integer,
  ADD COLUMN IF NOT EXISTS min_duolingo integer,
  ADD COLUMN IF NOT EXISTS min_act integer,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS university_type text,
  ADD COLUMN IF NOT EXISTS international_students_count integer,
  ADD COLUMN IF NOT EXISTS international_students_pct double precision,
  ADD COLUMN IF NOT EXISTS is_english_taught boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_study_visa_note text,
  ADD COLUMN IF NOT EXISTS undergraduate_url text,
  ADD COLUMN IF NOT EXISTS international_url text,
  ADD COLUMN IF NOT EXISTS application_platform text;

-- Finansial/akademik maydonlarni NULL ga ruxsat berish (spec §14 — hech qachon
-- taxminiy qiymat kiritilmaydi; ma'lumot yo'q bo'lsa NULL)
ALTER TABLE public.universities
  ALTER COLUMN annual_tuition_usd DROP NOT NULL,
  ALTER COLUMN annual_living_est_usd DROP NOT NULL,
  ALTER COLUMN min_gpa DROP NOT NULL,
  ALTER COLUMN min_ielts DROP NOT NULL,
  ALTER COLUMN min_sat DROP NOT NULL,
  ALTER COLUMN acceptance_rate DROP NOT NULL,
  ALTER COLUMN post_study_work_visa_years DROP NOT NULL,
  ALTER COLUMN image_url DROP NOT NULL;

-- QS-importda 0/default bo'lib qolgan qiymatlarni NULL ga o'tkazish
-- (0 = "ma'lum emas", spec: NULL tuition ≠ $0)
UPDATE public.universities
SET annual_tuition_usd = NULL,
    annual_living_est_usd = NULL,
    min_gpa = NULL,
    min_ielts = NULL,
    min_sat = NULL,
    acceptance_rate = NULL,
    post_study_work_visa_years = NULL
WHERE annual_tuition_usd = 0
  AND verification_status != 'verified';

-- ---------- 2) Yangi jadvallar ----------
CREATE TABLE IF NOT EXISTS public.university_programs (
  id serial PRIMARY KEY,
  university_id integer REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  field text,
  degree text,
  duration_years double precision,
  language text,
  tuition_amount integer,
  tuition_currency text NOT NULL DEFAULT 'USD',
  application_deadline date,
  min_ielts double precision,
  min_sat integer,
  program_url text,
  is_active boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_requirements (
  id serial PRIMARY KEY,
  program_id integer REFERENCES public.university_programs(id) ON DELETE CASCADE NOT NULL,
  requirement_type text NOT NULL,
  minimum_value double precision,
  value_text text,
  notes text,
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_cycles (
  id serial PRIMARY KEY,
  university_id integer REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  cycle_year integer NOT NULL,
  opening_date date,
  deadline date,
  deadline_type text NOT NULL DEFAULT 'exact',
  is_estimated boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.university_sources (
  id serial PRIMARY KEY,
  university_id integer REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  source_type text NOT NULL DEFAULT 'official_university',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campuses (
  id serial PRIMARY KEY,
  university_id integer REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Main Campus',
  address text,
  city text,
  country text,
  map_url text,
  nearby_airport text,
  accommodation_info text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.university_images (
  id serial PRIMARY KEY,
  university_id integer REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  is_primary boolean NOT NULL DEFAULT false,
  source_url text,
  created_at timestamp NOT NULL DEFAULT now()
);

-- ---------- 3) Tekshirish ----------
SELECT column_name FROM information_schema.columns
WHERE table_name = 'universities' AND column_name IN
  ('short_name','university_type','founded_year','tuition_currency','international_students_count')
ORDER BY column_name;
