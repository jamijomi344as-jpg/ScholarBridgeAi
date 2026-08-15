-- ============================================================================
-- SCHOLARBRIDGE — BAZANI APP SCHEMA BILAN MOSLASHTIRISH
-- (boshqa AI yaratgan jadvallarni bizning app kutgan nomlarga o'tkazish)
-- ============================================================================
--
-- MUAMMO:
--   Boshqa AI `university_programs` jadvalini `programs` deb nomladi va
--   `program_requirements` ustunlarini boshqa tuzilmaga o'zgartirdi.
--   Bizning app esa `university_programs`, `program_requirements`
--   (requirement_type tuzilmasi), `application_cycles` (bizning ustunlarimiz)
--   ni so'raydi → ular yo'q/turlicha → "Failed to fetch universities".
--
-- BU SKRIPT:
--   1. `programs` (agar mavjud bo'lsa) → `university_programs` deb nomlaydi
--      (ma'lumot saqlanadi, ustunlar moslashtiriladi)
--   2. `program_requirements` ga bizning ustunlarni qo'shadi (eskilari qoladi)
--   3. `application_cycles` ga bizning ustunlarni qo'shadi
--   4. `program_sources`, `scholarship_sources`, `sources` — bizning tuzilmaga
--      mos ekanini tekshiradi
--   5. Xavfsiz: hech narsa o'chirilmaydi, hamma narsa ADD IF NOT EXISTS
--
-- QANDAY ISHLATISH:
--   Supabase Dashboard → SQL Editor → New query → RUN
-- ============================================================================

-- ---------- 1) programs → university_programs (ma'lumot saqlanadi) ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='programs')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='university_programs') THEN
    ALTER TABLE public.programs RENAME TO university_programs;
  END IF;
END $$;

-- university_programs ga bizning ustunlarni qo'shish (agar programs bo'lmasa ham
-- ishlaydi — university_programs mavjud bo'lsa)
ALTER TABLE public.university_programs
  ADD COLUMN IF NOT EXISTS degree text,
  ADD COLUMN IF NOT EXISTS duration_years double precision,
  ADD COLUMN IF NOT EXISTS tuition_amount integer,
  ADD COLUMN IF NOT EXISTS tuition_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS tuition_period text NOT NULL DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS duration_unit text NOT NULL DEFAULT 'years',
  ADD COLUMN IF NOT EXISTS study_mode text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS application_deadline date,
  ADD COLUMN IF NOT EXISTS min_ielts double precision,
  ADD COLUMN IF NOT EXISTS min_sat integer,
  ADD COLUMN IF NOT EXISTS program_url text,
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- programs jadvalidagi eski ustunlarni bizning ustunlarimizga ko'chirish
-- (degree_level → degree, duration → duration_years, annual_tuition → tuition_amount)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='university_programs' AND column_name='degree_level') THEN
    UPDATE public.university_programs
    SET degree = degree_level
    WHERE degree IS NULL AND degree_level IS NOT NULL;
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='university_programs' AND column_name='duration') THEN
    UPDATE public.university_programs
    SET duration_years = duration
    WHERE duration_years IS NULL AND duration IS NOT NULL;
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='university_programs' AND column_name='annual_tuition') THEN
    UPDATE public.university_programs
    SET tuition_amount = annual_tuition
    WHERE tuition_amount IS NULL AND annual_tuition IS NOT NULL;
  END IF;
END $$;

-- ---------- 2) program_requirements — bizning tuzilmamizga moslash ----------
-- Bizning app: requirement_type, minimum_value, value_text, is_verified, ...
ALTER TABLE public.program_requirements
  ADD COLUMN IF NOT EXISTS requirement_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS minimum_value double precision,
  ADD COLUMN IF NOT EXISTS value_text text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- Eski alohida ustunlarni (min_ielts, min_toefl, ...) requirement_type qatorlariga
-- ko'chirish (agar hali qatorlar bo'lmasa)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='program_requirements' AND column_name='min_ielts')
     AND NOT EXISTS (SELECT 1 FROM public.program_requirements WHERE requirement_type='ielts') THEN
    INSERT INTO public.program_requirements (program_id, requirement_type, minimum_value, value_text, is_verified)
    SELECT program_id, 'ielts', min_ielts, NULL, true
    FROM public.program_requirements
    WHERE min_ielts IS NOT NULL;
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='program_requirements' AND column_name='min_gpa')
     AND NOT EXISTS (SELECT 1 FROM public.program_requirements WHERE requirement_type='gpa') THEN
    INSERT INTO public.program_requirements (program_id, requirement_type, minimum_value, value_text, is_verified)
    SELECT program_id, 'gpa', min_gpa, NULL, true
    FROM public.program_requirements
    WHERE min_gpa IS NOT NULL;
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='program_requirements' AND column_name='min_sat')
     AND NOT EXISTS (SELECT 1 FROM public.program_requirements WHERE requirement_type='sat') THEN
    INSERT INTO public.program_requirements (program_id, requirement_type, minimum_value, value_text, is_verified)
    SELECT program_id, 'sat', min_sat, NULL, true
    FROM public.program_requirements
    WHERE min_sat IS NOT NULL;
  END IF;
END $$;

-- ---------- 3) application_cycles — bizning ustunlarimizni qo'shish ----------
ALTER TABLE public.application_cycles
  ADD COLUMN IF NOT EXISTS cycle_year integer NOT NULL DEFAULT 2027,
  ADD COLUMN IF NOT EXISTS opening_date date,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS deadline_type text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS application_fee integer,
  ADD COLUMN IF NOT EXISTS application_fee_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS is_estimated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- ---------- 4) university_sources / sources ----------
ALTER TABLE public.university_sources
  ADD COLUMN IF NOT EXISTS source_id integer REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS accessed_at timestamp,
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- ---------- 5) Tekshirish ----------
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
  ('universities','university_programs','program_requirements','application_cycles','sources','university_sources','program_sources','scholarship_sources','scholarships')
ORDER BY table_name;
