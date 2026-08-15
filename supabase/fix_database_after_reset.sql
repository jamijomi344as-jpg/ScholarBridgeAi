-- ============================================================================
-- SCHOLARBRIDGE — BAZANI TIKLASH
-- (boshqa AI yaratgan noto'g'ri schema'ni olib tashlash)
-- ============================================================================
--
-- NIMA BO'LDI:
--   Boshqa AI bilan gaplashib, Supabase'da bizning app jadvallarimiz
--   (universities, scholarships, saved_universities, saved_scholarships)
--   O'CHIRILIB, o'rniga UUID-based boshqa schema yaratilgan.
--   Shuning uchun app "Failed to fetch universities" xatosi beradi.
--
-- BU SKRIPT NIMA QILADI:
--   1. Boshqa AI yaratgan barcha jadvallarni o'chiradi
--   2. Bizning app'ning jadvallariga tegmaydi (student_profiles, courses,
--      payments va h.k. — ular o'chirilmagan, saqlanib qolgan)
--   3. Keyin Render'da redeploy qilinsa, `npm run db:push` bizning
--      universities / scholarships / saved_* jadvallarini QAYTA YARATADI
--      va seed ma'lumotlar bilan to'ldiradi
--
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Quyidagi skriptni qo'ying va RUN bosing
--   3. Keyin Render'da: Manual Deploy → Deploy latest commit
--      (build'dagi db:push jadvallarni qayta yaratadi + seed ishlaydi)
-- ============================================================================

-- ---------- 1) Boshqa AI yaratgan jadvallarni o'chirish ----------
-- (bolalar jadvallardan boshlaymiz — FK bog'liqliklari uchun)

DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.saved_scholarships CASCADE;
DROP TABLE IF EXISTS public.saved_universities CASCADE;
DROP TABLE IF EXISTS public.application_cycles CASCADE;
DROP TABLE IF EXISTS public.deadline_patterns CASCADE;
DROP TABLE IF EXISTS public.scholarship_sources CASCADE;
DROP TABLE IF EXISTS public.program_sources CASCADE;
DROP TABLE IF EXISTS public.university_sources CASCADE;
DROP TABLE IF EXISTS public.scholarship_requirements CASCADE;
DROP TABLE IF EXISTS public.university_requirements CASCADE;
DROP TABLE IF EXISTS public.program_requirements CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.scholarships CASCADE;
DROP TABLE IF EXISTS public.universities CASCADE;
DROP TABLE IF EXISTS public.sources CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.cities CASCADE;
DROP TABLE IF EXISTS public.countries CASCADE;

-- ---------- 2) Boshqa AI yaratgan enum turlarini o'chirish ----------
DROP TYPE IF EXISTS public.verification_status CASCADE;
DROP TYPE IF EXISTS public.opportunity_status CASCADE;
DROP TYPE IF EXISTS public.source_type CASCADE;
DROP TYPE IF EXISTS public.degree_level CASCADE;
DROP TYPE IF EXISTS public.application_status CASCADE;
DROP TYPE IF EXISTS public.requirement_type CASCADE;

-- ---------- 3) Tekshirish ----------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
