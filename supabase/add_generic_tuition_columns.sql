-- ============================================================================
-- SCHOLARBRIDGE — GENERIC CURRENCY TUITION COLUMNS (universities)
-- ============================================================================
--
-- MUHIM:
--   - Bu fayl QO'LDA ishga tushiriladi (Supabase SQL Editor) — avtomatik emas.
--   - Eski USD ustunlari o'chirilmaydi, nomi o'zgartirilmaydi.
--   - Hech qanday ma'lumot o'zgartirilmaydi (UPDATE yo'q).
--   - Yangi ustunlar NULL bo'lib qoladi — faqat aniq manba bo'lsa to'ldiriladi.
--
-- QANDAY ISHLATISH:
--   Supabase Dashboard → SQL Editor → New query → RUN
-- ============================================================================

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS annual_tuition numeric,
  ADD COLUMN IF NOT EXISTS tuition_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS tuition_period text NOT NULL DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS annual_living_est numeric,
  ADD COLUMN IF NOT EXISTS living_cost_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS living_cost_period text NOT NULL DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS accommodation_cost numeric,
  ADD COLUMN IF NOT EXISTS accommodation_cost_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS accommodation_cost_period text NOT NULL DEFAULT 'year';

-- Eslatma: eski ustunlar (annual_tuition_usd, annual_living_est_usd,
-- accommodation_cost_usd) o'z joyida qoladi — backward compatibility uchun.

-- Tekshirish:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'universities'
  AND column_name IN (
    'annual_tuition','tuition_currency','tuition_period',
    'annual_living_est','living_cost_currency','living_cost_period',
    'accommodation_cost','accommodation_cost_currency','accommodation_cost_period',
    'annual_tuition_usd','annual_living_est_usd','accommodation_cost_usd'
  )
ORDER BY column_name;
