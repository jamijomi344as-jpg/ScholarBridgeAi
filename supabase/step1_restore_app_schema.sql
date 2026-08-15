-- ============================================================================
-- SCHOLARBRIDGE — BAZANI TIKLASH: STEP 1
-- (boshqa AI yaratgan schema'ni olib tashlash, QS ma'lumotini saqlab qolish)
-- ============================================================================
--
-- NIMA QILADI:
--   1. Boshqa AI yaratgan, bizning app bilan MOS KELMAYDIGAN jadvallarni
--      o'chiradi (ularning foydalanuvchi jadvallari Supabase Auth talab qiladi)
--   2. QIMMATLI ma'lumotlarni (QS 2027 — 100 ta universitet) saqlab qolish
--      uchun ularni vaqtincha _foreign nomiga o'zgartiradi
--   3. Keyin Render'da redeploy qiling — `db:push` bizning original
--      jadvallarni (universities, scholarships, saved_*) qayta yaratadi
--   4. So'ng STEP 2 skriptini ishga tushiring — QS ma'lumotlari bizning
--      schema'ga import qilinadi
--
-- ISHLATISH TARTIBI:
--   A) Bu skriptni Supabase SQL Editor'da RUN qiling
--   B) Render → Manual Deploy → Deploy latest commit (db:push ishlaydi)
--   C) supabase/step2_import_qs_data.sql ni RUN qiling
-- ============================================================================

-- ---------- 1) Boshqa AI yaratgan jadvallarni o'chirish ----------
-- (auth.uid() talab qiladigan foydalanuvchi jadvallari + yordamchi jadvallar)
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
DROP TABLE IF EXISTS public.sources CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ---------- 2) QIMMATLI ma'lumotlarni saqlab qolish ----------
-- (vaqtincha nomini o'zgartiramiz — STEP 2 ularni bizning schema'ga ko'chiradi)
ALTER TABLE IF EXISTS public.universities RENAME TO universities_foreign;
ALTER TABLE IF EXISTS public.countries RENAME TO countries_foreign;
ALTER TABLE IF EXISTS public.cities RENAME TO cities_foreign;
ALTER TABLE IF EXISTS public.scholarships RENAME TO scholarships_foreign;

-- ---------- 3) Tekshirish ----------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
