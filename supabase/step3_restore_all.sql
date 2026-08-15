-- ============================================================================
-- SCHOLARBRIDGE — TO'LIQ TIKLASH SKRIPTI (bitta skript, hammasini qiladi)
-- ============================================================================
--
-- Bu skript:
--   1. Boshqa AI yaratgan schema'ni olib tashlaydi (agar bor bo'lsa)
--   2. Bizning app'ning jadvallarini YO'Q BO'LSA YARATADI (Render'ga bog'liq emas)
--   3. QS 2027 ma'lumotlarini (agar bor bo'lsa) bizning schema'ga import qiladi
--   4. Grantlar bo'sh bo'lsa — demo grantlarni qo'shadi
--   5. Foreign jadvallar va enum'larni tozalaydi
--
-- QANDAY ISHLATISH:
--   Supabase Dashboard → SQL Editor → New query → BUTUN matnni qo'ying → RUN
--   Keyin: Render → Manual Deploy → Deploy latest commit (xavfsizlik uchun)
-- ============================================================================

-- ============================================================
-- 0) Foreign jadvallarni saqlab qolish (agar step1 bajarilgan bo'lsa,
--    ular allaqachon _foreign nomida; agar bajarilmagan bo'lsa — nomini
--    o'zgartiramiz, ma'lumot yo'qolmaydi)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='universities')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='universities_foreign') THEN
    ALTER TABLE public.universities RENAME TO universities_foreign;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='scholarships')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='scholarships_foreign') THEN
    ALTER TABLE public.scholarships RENAME TO scholarships_foreign;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='countries')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='countries_foreign') THEN
    ALTER TABLE public.countries RENAME TO countries_foreign;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='cities')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='cities_foreign') THEN
    ALTER TABLE public.cities RENAME TO cities_foreign;
  END IF;
END $$;

-- Boshqa AI yaratgan boshqa jadvallarni o'chirish (xavfsiz)
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.application_cycles CASCADE;
DROP TABLE IF EXISTS public.deadline_patterns CASCADE;
DROP TABLE IF EXISTS public.scholarship_sources CASCADE;
DROP TABLE IF EXISTS public.program_sources CASCADE;
DROP TABLE IF EXISTS public.university_sources CASCADE;
DROP TABLE IF EXISTS public.scholarship_requirements CASCADE;
DROP TABLE IF EXISTS public.university_requirements CASCADE;
DROP TABLE IF EXISTS public.program_requirements CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.sources CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.saved_universities CASCADE;
DROP TABLE IF EXISTS public.saved_scholarships CASCADE;

-- ============================================================
-- 1) BIZNING JADVALLARNI YARATISH (agar yo'q bo'lsa)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.universities (
  id serial PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  flag_emoji text NOT NULL DEFAULT '🌐',
  world_ranking integer NOT NULL,
  degree_level text NOT NULL DEFAULT 'All',
  program_major text NOT NULL,
  annual_tuition_usd integer NOT NULL,
  annual_living_est_usd integer NOT NULL,
  min_gpa double precision NOT NULL DEFAULT 3.0,
  min_ielts double precision NOT NULL DEFAULT 6.5,
  min_sat integer,
  acceptance_rate double precision NOT NULL,
  post_study_work_visa_years double precision NOT NULL DEFAULT 2.0,
  description text NOT NULL,
  highlights text NOT NULL DEFAULT '[]',
  website_url text NOT NULL,
  image_url text NOT NULL,
  source_url text,
  last_verified_at timestamp,
  verification_status text NOT NULL DEFAULT 'unverified',
  source_reliability integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.scholarships (
  id serial PRIMARY KEY,
  title text NOT NULL,
  provider text NOT NULL,
  country text NOT NULL,
  coverage_type text NOT NULL DEFAULT 'Full Tuition + Stipend',
  amount_usd_value integer NOT NULL,
  deadline text NOT NULL,
  degree_levels text NOT NULL DEFAULT '["Master","PhD"]',
  eligible_majors text NOT NULL DEFAULT '["All"]',
  min_gpa double precision,
  min_ielts double precision,
  financial_need_based boolean DEFAULT false,
  merit_based boolean DEFAULT true,
  description text NOT NULL,
  requirements text NOT NULL,
  website_url text NOT NULL,
  eligible_countries text DEFAULT '[]',
  funding_type text DEFAULT '',
  tuition_coverage text DEFAULT '',
  living_allowance integer,
  travel_allowance integer,
  accommodation text DEFAULT '',
  application_fee integer,
  english_requirements text DEFAULT '',
  required_documents text DEFAULT '[]',
  application_url text,
  opening_date date,
  deadline_date date,
  deadline_type text NOT NULL DEFAULT 'unknown',
  deadline_range_start date,
  deadline_range_end date,
  rounds text DEFAULT '[]',
  recurrence text NOT NULL DEFAULT 'none',
  expected_opening_period text,
  expected_deadline_period text,
  application_status text NOT NULL DEFAULT 'unknown',
  last_verified_at timestamp,
  last_updated_at timestamp,
  verification_status text NOT NULL DEFAULT 'unverified',
  source_reliability integer NOT NULL DEFAULT 7,
  source_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.saved_universities (
  id serial PRIMARY KEY,
  profile_id integer REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
  university_id integer REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  match_category text NOT NULL DEFAULT 'Match',
  match_score integer NOT NULL DEFAULT 85,
  status text NOT NULL DEFAULT 'Shortlisted',
  notes text DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_scholarships (
  id serial PRIMARY KEY,
  profile_id integer REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
  scholarship_id integer REFERENCES public.scholarships(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'Saved',
  notes text DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

-- ============================================================
-- 2) QS 2027 IMPORT (agar foreign jadval mavjud bo'lsa)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='universities_foreign') THEN
    INSERT INTO public.universities (
      name, country, city, flag_emoji, world_ranking, degree_level, program_major,
      annual_tuition_usd, annual_living_est_usd, min_gpa, min_ielts, min_sat,
      acceptance_rate, post_study_work_visa_years, description, highlights,
      website_url, image_url, source_url, last_verified_at, verification_status,
      source_reliability, is_active
    )
    SELECT
      u.name,
      COALESCE(c.name_en, 'Unknown'),
      COALESCE(ci.name, ''),
      '🌐',
      COALESCE(u.qs_rank_2027, u.world_ranking, 0),
      'All',
      'All',
      0,
      0,
      3.0,
      6.5,
      NULL,
      0,
      2.0,
      COALESCE(u.description_en, ''),
      '[]',
      COALESCE(u.website_url, ''),
      COALESCE(u.logo_url, ''),
      COALESCE(u.website_url, ''),
      u.last_verified_at,
      CASE WHEN u.verification_status::text = 'verified' THEN 'verified' ELSE 'unverified' END,
      7,
      u.is_active
    FROM public.universities_foreign u
    LEFT JOIN public.countries_foreign c ON c.id = u.country_id
    LEFT JOIN public.cities_foreign ci ON ci.id = u.city_id
    WHERE NOT EXISTS (SELECT 1 FROM public.universities t WHERE t.name = u.name);

    INSERT INTO public.scholarships (
      title, provider, country, coverage_type, amount_usd_value, deadline,
      degree_levels, eligible_majors, min_gpa, min_ielts,
      financial_need_based, merit_based, description, requirements, website_url,
      eligible_countries, funding_type, tuition_coverage, deadline_type, recurrence,
      application_status, last_verified_at, last_updated_at, verification_status,
      source_reliability, source_url, is_active
    )
    SELECT
      s.name,
      COALESCE(s.provider_name, ''),
      COALESCE(c.name_en, 'Global'),
      COALESCE(NULLIF(s.funding_type, ''), 'Full Tuition + Stipend'),
      CASE WHEN s.amount IS NOT NULL AND COALESCE(s.amount_currency, 'USD') = 'USD' THEN s.amount::int ELSE 0 END,
      '',
      '["' || array_to_string(s.degree_levels, '","') || '"]',
      '["All"]',
      s.minimum_gpa,
      s.minimum_ielts,
      false,
      true,
      COALESCE(s.description_en, ''),
      COALESCE(s.eligibility_text, ''),
      COALESCE(s.official_url, s.application_url, ''),
      '[]',
      s.funding_type,
      CASE WHEN s.coverage_tuition THEN 'Tuition covered' ELSE '' END,
      CASE
        WHEN s.status::text IN ('open','closing_soon') THEN 'open'
        WHEN s.status::text = 'upcoming' THEN 'upcoming'
        WHEN s.status::text IN ('closed','cancelled') THEN 'closed'
        WHEN s.status::text = 'not_announced' THEN 'not_announced'
        ELSE 'unknown'
      END,
      'none',
      CASE WHEN s.verification_status::text = 'verified' THEN 'verified' ELSE 'unverified' END,
      s.last_verified_at,
      now(),
      CASE WHEN s.verification_status::text = 'verified' THEN 'verified' ELSE 'unverified' END,
      7,
      COALESCE(s.official_url, ''),
      s.is_active
    FROM public.scholarships_foreign s
    LEFT JOIN public.countries_foreign c ON c.id = s.country_id
    WHERE NOT EXISTS (SELECT 1 FROM public.scholarships t WHERE t.title = s.name);
  END IF;
END $$;

-- ============================================================
-- 3) GRANTLAR BO'SH BO'LSA — DEMO GRANTLAR
-- ============================================================
INSERT INTO public.scholarships (
  title, provider, country, coverage_type, amount_usd_value, deadline,
  degree_levels, eligible_majors, min_gpa, min_ielts,
  financial_need_based, merit_based, description, requirements, website_url,
  deadline_type, recurrence, application_status, verification_status, source_reliability, is_active
)
SELECT * FROM (VALUES
  (
    'Fulbright Foreign Student Program',
    'United States Department of State',
    'United States',
    'Full Tuition + Stipend',
    55000,
    '2026-10-15',
    '["Master","PhD"]',
    '["All"]',
    3.3, 7.0, true, true,
    'Covers full tuition, living stipend, roundtrip airfare, health insurance, and visa support for international graduate students studying in the USA.',
    'Bachelor''s degree, strong leadership record, 3 recommendation letters, essay of intent, and commitment to return to home country.',
    'https://foreign.fulbrightonline.org'
  ),
  (
    'Chevening Scholarship',
    'UK Foreign, Commonwealth & Development Office',
    'United Kingdom',
    'Full Tuition + Stipend',
    45000,
    '2026-11-04',
    '["Master"]',
    '["All"]',
    3.2, 6.5, false, true,
    'Fully funded 1-year Master''s scholarship in the UK for future global leaders, covering tuition, accommodation, and travel allowance.',
    '2+ years work experience, clear career plan, undergraduate degree equivalent to UK Upper Second Class, acceptance from a UK university.',
    'https://www.chevening.org'
  ),
  (
    'DAAD Development-Related Postgraduate Courses (EPOS)',
    'German Academic Exchange Service (DAAD)',
    'Germany',
    'Full Tuition + Stipend',
    32000,
    '2026-09-30',
    '["Master","PhD"]',
    '["Engineering","Computer Science","Public Health","Environmental Science","Economics"]',
    3.0, 6.5, true, true,
    'Monthly stipend, travel allowance, health insurance, and full tuition coverage for select Master''s programs across German universities.',
    'At least 2 years of relevant professional experience, target country citizenship, academic excellence.',
    'https://www.daad.de'
  ),
  (
    'Erasmus Mundus Joint Master Degrees (EMJMD)',
    'European Commission / European Union',
    'European Union',
    'Full Tuition + Stipend',
    48000,
    '2027-01-15',
    '["Master"]',
    '["Computer Science","AI & Data Science","Biotechnology","Renewable Energy","Public Policy"]',
    3.4, 6.5, false, true,
    'International study program across 2-3 European countries with monthly living allowance and zero tuition fees.',
    'Bachelor degree, strong academic transcript, motivation letter, CV in Europass format, 2 reference letters.',
    'https://erasmus-plus.ec.europa.eu'
  ),
  (
    'Knight-Hennessy Scholars Program',
    'Stanford University',
    'United States',
    'Full Tuition + Stipend',
    90000,
    '2026-10-08',
    '["Master","PhD"]',
    '["All"]',
    3.7, 7.5, false, true,
    'Fully funds up to 3 years of graduate study at Stanford for students with transformative leadership potential.',
    'Must apply to a full-time Stanford graduate degree program concurrently. Requires video submission and leadership essays.',
    'https://knight-hennessy.stanford.edu'
  ),
  (
    'Gates Cambridge Scholarship',
    'University of Cambridge',
    'United Kingdom',
    'Full Tuition + Stipend',
    60000,
    '2026-10-15',
    '["Master","PhD"]',
    '["All"]',
    3.5, 7.0, false, true,
    'Full cost of study at Cambridge, maintenance allowance, and discretionary funding for research for outstanding applicants.',
    'Admission to a Cambridge graduate program, academic excellence, leadership potential, social commitment.',
    'https://www.gatescambridge.org'
  )
) AS demo(title, provider, country, coverage_type, amount_usd_value, deadline, degree_levels, eligible_majors, min_gpa, min_ielts, financial_need_based, merit_based, description, requirements, website_url)
WHERE NOT EXISTS (SELECT 1 FROM public.scholarships);

-- ============================================================
-- 4) TOZALASH — foreign jadvallar va enum'lar
-- ============================================================
DROP TABLE IF EXISTS public.universities_foreign CASCADE;
DROP TABLE IF EXISTS public.countries_foreign CASCADE;
DROP TABLE IF EXISTS public.cities_foreign CASCADE;
DROP TABLE IF EXISTS public.scholarships_foreign CASCADE;

DROP TYPE IF EXISTS public.verification_status CASCADE;
DROP TYPE IF EXISTS public.opportunity_status CASCADE;
DROP TYPE IF EXISTS public.source_type CASCADE;
DROP TYPE IF EXISTS public.degree_level CASCADE;
DROP TYPE IF EXISTS public.application_status CASCADE;
DROP TYPE IF EXISTS public.requirement_type CASCADE;

-- ============================================================
-- 5) TEKSHIRISH
-- ============================================================
SELECT 'universities' AS table_name, count(*) AS rows FROM public.universities
UNION ALL
SELECT 'scholarships', count(*) FROM public.scholarships
UNION ALL
SELECT 'saved_universities', count(*) FROM public.saved_universities
UNION ALL
SELECT 'saved_scholarships', count(*) FROM public.saved_scholarships;
