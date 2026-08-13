-- ============================================================================
-- ScholarBridge — Referal tizimi + Onboarding wizard uchun baza yangilanishi
-- ============================================================================
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Quyidagi SQL'ni to'liq ko'chirib qo'ying
--   3. "Run" tugmasini bosing
--   4. Saytni yangilang (Ctrl+Shift+R)
--
-- Bu skript xavfsiz: ADD COLUMN IF NOT EXISTS — ustun allaqachon mavjud
-- bo'lsa, xato bermaydi va qayta ishga tushirish mumkin.
-- ============================================================================

-- 1) Yangi ustunlar (student_profiles jadvaliga)
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by integer REFERENCES student_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_rewarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until timestamp,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2) Mavjud (eski) profillar: onboarding tugallangan deb belgilanadi,
--    shunda 8 qadamli wizard ularni "o'g'irlab" olmaydi.
--    Referral kodlarni esa ilova o'zi generatsiya qiladi (har yuklashda).
UPDATE student_profiles
SET onboarding_completed = true,
    onboarding_step = 8
WHERE onboarding_completed = false
  AND referral_code IS NULL;

-- 3) Tekshirish: ustunlar borligini ko'rish uchun
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'student_profiles'
  AND column_name IN (
    'referral_code', 'referred_by', 'referral_points', 'referral_rewarded',
    'is_premium', 'premium_until', 'onboarding_step', 'onboarding_completed'
  )
ORDER BY column_name;
