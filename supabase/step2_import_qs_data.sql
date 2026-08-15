-- ============================================================================
-- SCHOLARBRIDGE — BAZANI TIKLASH: STEP 2
-- (QS 2027 ma'lumotlarini bizning schema'ga import qilish)
-- ============================================================================
--
-- SHART: STEP 1 ishga tushirilgan VA Render redeploy qilingan bo'lishi kerak
-- (db:push bizning original jadvallarni yaratishi shart).
--
-- NIMA QILADI:
--   1. universities_foreign (QS 2027) → bizning universities jadvaliga
--   2. scholarships_foreign (agar bo'lsa) → bizning scholarships jadvaliga
--   3. Agar grantlar bo'sh bo'lsa — demo grantlarni qo'shadi
--   4. _foreign jadvallarni va enum'larni o'chiradi
-- ============================================================================

-- ---------- 1) UNIVERSITIES: QS 2027 → bizning schema ----------
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

-- ---------- 2) SCHOLARSHIPS: foreign (agar bo'lsa) → bizning schema ----------
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
    WHEN s.status::text = 'open' THEN 'open'
    WHEN s.status::text = 'upcoming' THEN 'upcoming'
    WHEN s.status::text = 'closing_soon' THEN 'open'
    WHEN s.status::text = 'closed' THEN 'closed'
    WHEN s.status::text = 'cancelled' THEN 'closed'
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

-- ---------- 3) Agar grantlar bo'sh bo'lsa — demo grantlar ----------
INSERT INTO public.scholarships (
  title, provider, country, coverage_type, amount_usd_value, deadline,
  degree_levels, eligible_majors, min_gpa, min_ielts,
  financial_need_based, merit_based, description, requirements, website_url,
  deadline_type, recurrence, application_status, verification_status,
  source_reliability, is_active
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

-- ---------- 4) Tozalash: foreign jadvallar va enum'lar ----------
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

-- ---------- 5) Tekshirish ----------
SELECT 'universities' AS table_name, count(*) FROM public.universities
UNION ALL
SELECT 'scholarships', count(*) FROM public.scholarships;
