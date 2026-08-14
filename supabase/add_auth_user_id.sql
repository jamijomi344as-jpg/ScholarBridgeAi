-- ============================================================================
-- ScholarBridge — Supabase Auth uchun baza yangilanishi
-- ============================================================================
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Quyidagi SQL'ni qo'ying va "Run" bosing
--
-- auth_user_id ustuni student_profiles jadvalini Supabase Auth foydalanuvchisi
-- bilan bog'laydi. Eski (auth'dan oldin yaratilgan) profillar NULL bo'ladi —
-- ilova ularni email orqali avtomatik bog'laydi (claim), shuning uchun
-- Hushnudbek admin hisobi ham ishlashda davom etadi.
-- ============================================================================

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id text UNIQUE;

-- Tekshirish:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_profiles'
  AND column_name = 'auth_user_id';
