-- ============================================================================
-- SCHOLARBRIDGE — APPLICATION SYSTEM EXTENSION (spec §1-§18)
-- ============================================================================
-- Xavfsiz: ALTER TABLE ... ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
-- Mavjud jadvallar/ustunlar/ma'lumotlar o'chirilmaydi.
-- ============================================================================

-- ---------- 1) scholarships → university_id (NULL = global scholarship) ----------
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS university_id integer REFERENCES public.universities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_scholarships_university ON public.scholarships(university_id);

-- ---------- 2) university_programs kengaytmasi ----------
ALTER TABLE public.university_programs
  ADD COLUMN IF NOT EXISTS duration_unit text NOT NULL DEFAULT 'years',
  ADD COLUMN IF NOT EXISTS study_mode text,
  ADD COLUMN IF NOT EXISTS tuition_period text NOT NULL DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_programs_university ON public.university_programs(university_id);

-- ---------- 3) program_requirements kengaytmasi ----------
ALTER TABLE public.program_requirements
  ADD COLUMN IF NOT EXISTS subject_requirements text,
  ADD COLUMN IF NOT EXISTS portfolio_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS interview_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendation_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personal_statement_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_requirements text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_program_reqs_program ON public.program_requirements(program_id);

-- ---------- 4) application_cycles kengaytmasi ----------
ALTER TABLE public.application_cycles
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS intake text,
  ADD COLUMN IF NOT EXISTS application_type text,
  ADD COLUMN IF NOT EXISTS deadline_timezone text,
  ADD COLUMN IF NOT EXISTS application_fee integer,
  ADD COLUMN IF NOT EXISTS application_fee_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS official_source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_cycles_university ON public.application_cycles(university_id);
CREATE INDEX IF NOT EXISTS idx_cycles_deadline ON public.application_cycles(deadline);

-- ---------- 5) university_sources kengaytmasi ----------
ALTER TABLE public.university_sources
  ADD COLUMN IF NOT EXISTS source_id integer REFERENCES public.sources(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_uni_sources_university ON public.university_sources(university_id);

-- ---------- 6) YANGI jadvallar ----------

-- sources (spec §10)
CREATE TABLE IF NOT EXISTS public.sources (
  id serial PRIMARY KEY,
  url text NOT NULL,
  title text NOT NULL,
  domain text,
  source_type text NOT NULL DEFAULT 'official_website',
  accessed_at timestamp,
  is_official boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sources_domain ON public.sources(domain);

-- program_sources (spec §7)
CREATE TABLE IF NOT EXISTS public.program_sources (
  id serial PRIMARY KEY,
  program_id integer REFERENCES public.university_programs(id) ON DELETE CASCADE NOT NULL,
  source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'official_program',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_program_sources_program ON public.program_sources(program_id);

-- scholarship_sources (spec §9)
CREATE TABLE IF NOT EXISTS public.scholarship_sources (
  id serial PRIMARY KEY,
  scholarship_id integer REFERENCES public.scholarships(id) ON DELETE CASCADE NOT NULL,
  source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'official_scholarship',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sch_sources_scholarship ON public.scholarship_sources(scholarship_id);

-- ---------- 7) Tekshirish ----------
SELECT 'sources' AS t, count(*) FROM public.sources
UNION ALL SELECT 'university_programs', count(*) FROM public.university_programs
UNION ALL SELECT 'application_cycles', count(*) FROM public.application_cycles
UNION ALL SELECT 'universities', count(*) FROM public.universities;
