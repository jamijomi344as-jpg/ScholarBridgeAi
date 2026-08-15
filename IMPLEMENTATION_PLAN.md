# ScholarBridge — Tahlil va Implementatsiya Rejasi

Sana: 2026-08-15
Asos: Hakimov tomonidan berilgan 27-bo'limli spetsifikatsiya
Qoida: mavjud arxitektura buzilmaydi, faqat kengaytiriladi

---

## 1. MAVJUD LOYIHA TAHLILI (spetsifikatsiyaning 1-vazifasi)

### 1.1 Texnologik stack (tasdiqlangan)

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, lucide-react |
| Backend | Next.js API route handler'lar (~45 ta endpoint) |
| ORM | Drizzle ORM + node-postgres (drizzle-kit push, migratsiya fayllari yo'q) |
| Baza | PostgreSQL (Supabase) — 29 ta jadval |
| Auth | **HAQIQIY AUTH YO'Q** — demo profil switcher + admin-login (Hushnudbek username+email) |
| AI | OpenRouter (yaqinda Gemini'dan ko'chirildi), bitta `callAI()` — src/lib/ai.ts |
| To'lov | Payme + Click (demo darajasida), `PREMIUM_PRICE_UZS = 59000` qattiq kodlangan |
| i18n | en/uz/ru (next-intl + custom provider + middleware) |
| Referal | referral_code, referral_points, 5 ball = 30 kun premium |
| Deploy | Render (auto-deploy, db:push build'da) |

### 1.2 Baza sxemasi (29 jadval)

- **Profil:** `student_profiles` (auth_user_id YO'Q — olib tashlandi), `aiEvaluations`
- **Universitetlar:** `universities` — 17 maydon (statik, verification maydonlari yo'q)
- **Grantlar:** `scholarships` — 16 maydon (statik, lifecycle/verification yo'q)
- **Saqlanganlar:** `savedUniversities`, `savedScholarships`
- **Ariza:** `applicationTasks` (statik milestone'lar, `due_date` text)
- **Forum:** `forumCategories`, `forumThreads`, `forumReplies`, `forumLikes`, `forumReports`
- **Kurslar:** `courses` → `courseModules` → `lessons` → `quizzes` → `quizQuestions` + `lessonProgress`, `quizAttempts`, `certificates`
- **To'lov:** `payments`, `subscriptions` (plan/status/currentPeriodEnd/paymentId)
- **Gamifikatsiya:** `userPoints`, `pointsLedger`, `levels`, `badges`, `userBadges`
- **Referal:** `referrals` (anchor + referral rows)

### 1.3 API endpoint'lar (45 ta)

`admin/*` (5: universities, scholarships, courses, premium, profiles) · `ai/*` (4: chat, draft-sop, evaluate-profile, review-sop) · `auth/admin-login` · `payments/*` (5: initiate, click/prepare, click/complete, payme/webhook, route) · `premium/status` · `certificates/*` (2) · `courses/*` (4) · `forum/*` (8) · `gamification/*` (3) · `profiles/*` (2) · `quizzes/attempt` · `referral(s)` (2) · `saved-*` (2) · `scholarships`, `universities`, `tasks`, `health`

### 1.4 Komponentlar (30+)

`Navbar` (sidebar+mobile) · `LandingPage` · `OnboardingWizard` (8 qadam) · `PremiumGate` · `ProfilePicker` · `DashboardView` · `UniversityExplorer` · `ScholarshipHub` · `ApplicationTracker` · `AiSopStudio` · `TaskRoadmap` · `AiChatMentor` · `ForumSection` + forum/* · `CoursesSection` + course/* · `PaymentsSection` · `RewardsSection` · `FaqSection` · `AdminPanel` + admin/* (4 manager)

### 1.5 Mavjud env o'zgaruvchilari

`DATABASE_URL` · `NEXT_PUBLIC_APP_URL` · `OPENROUTER_API_KEY` · `OPENROUTER_MODEL` · `ADMIN_NAME` · `ADMIN_EMAIL` · `PAYME_*` (4) · `CLICK_*` (4)

### 1.6 Asosiy kamchiliklar (spetsifikatsiyaga nisbatan)

| # | Spetsifikatsiya talabi | Hozirgi holat | Bo'shliq |
|---|---|---|---|
| 1 | Auth | Yo'q (demo profil) | **Tub kamchilik** — ko'p bo'lim unga bog'liq |
| 2 | Scholarship lifecycle | Statik 16 maydon | Deadline turlari, davrlar, status yo'q |
| 3 | Source verification | Yo'q | verification/source maydonlari yo'q |
| 4 | Audit log | Yo'q | change history jadvali yo'q |
| 5 | Avtomatik yangilash | Yo'q | scheduler infra yo'q |
| 6 | AI abstraction | Bitta provider, bitta funksiya | Router, task-based provider, cost control yo'q |
| 7 | Entitlement tizimi | `PremiumGate` + `isPremium` tarqoq | Markazlashgan emas |
| 8 | To'lov | Payme/Click demo, 59000 hardcoded | Subscription/renewal yo'q, config yo'q |
| 9 | Notification | Yo'q | 0 tizim |
| 10 | Deadline center | Yo'q | faqat statik task'lar |
| 11 | Document checklist | Yo'q | yo'q |
| 12 | Admin review workflow | CRUD bor, review/approve yo'q | yo'q |
| 13 | Hardcoded data | Seed'da 12 uni + 6 sch (boshlang'ich), AI fallback'da hardcoded javoblar, PRICE hardcoded | Konfiguratsiya qatlami kerak |

---

## 2. IMPLEMENTATSIYA REJASI (mavjud arxitektura asosida)

Reja **bosqichma-bosqich**, har bosqich alohida commit + build tekshiruvi bilan.
Har bir bosqich mavjud funksionallikni buzmasdan qo'shiladi.

### BOSQICH 0 — Poydevor qarorlari (avval siz tasdiqlashingiz kerak)

**0.1 Auth tizimi** — spetsifikatsiyaning 19-bo'limi va 20/21/22/25-bo'limlar **haqiqiy foydalanuvchi hisoblarisiz ishlamaydi** (notifications, quotas, personalized, payment per-user). Variantlar:
- **A) Supabase Auth qayta ulash** (email+parol+OTP, Google) — baza allaqachon Supabase'da; avvalgi muammolar config bilan bog'liq edi, yechiladigan
- **B) O'zimizning email+parol auth** (bcrypt + JWT/session cookie) — to'liq nazorat, lekin ko'proq ish
- **C) Hozircha demo-profillar** — tez, lekin 20+ bo'limlar kechiktiriladi

**0.2 To'lov provayderi** — Payme/Click (UZS, lokal) demo darajasida. Spetsifikatsiya "production payment provider" deydi:
- **A) Payme/Click ni production'ga olib chiqish** (mavjud kodni kengaytirish — subscriptions/renewal)
- **B) Stripe/PayPal qo'shish** (xalqaro, lekin UZ foydalanuvchilar uchun mos emas)
- **C) Ikkalasi** — Payme/Click UZ bozori, Stripe xalqaro

**0.3 Scheduler** — Render free tier'da cron yo'q:
- **A) Render Cron Job** (yangi bepul service, har kuni endpoint'ga ping)
- **B) External uptime/cron (cron-job.org bepul)** → `/api/cron/refresh` endpoint
- **C) Har bir admin sayt ochganda "agar 24h o'tgan bo'lsa" tekshirish** (soddaroq, avtomatik emas)

### BOSQICH 1 — Ma'lumotlar yaxlitligi (spetsifikatsiya 3-11-bo'limlar)

**1.1 Scholarship lifecycle maydonlari** (`scholarships` jadvaliga qo'shiladi):
```
eligible_countries (json) · funding_type · tuition_coverage · living_allowance ·
travel_allowance · accommodation · application_fee · english_requirements ·
required_documents (json) · application_url · source_url ·
opening_date (date, null) · deadline (date, null) · deadline_type
  (exact|range|rolling|multiple_rounds|not_announced|recurring|unknown) ·
deadline_range_start/end · rounds (json) · expected_opening_period (text) ·
expected_deadline_period (text) · recurrence (none|annual) ·
application_status (open|closed|upcoming|rolling|not_announced|unknown) ·
last_verified_at · verified_by · verification_status
  (verified|recently_verified|needs_verification|unverified) ·
source_reliability (1-7) · is_active · notes
```
- **Status logika** serverda (funksiya `computeScholarshipStatus()`): sana orqali avtomatik
- **Eski yozuvlar o'chirilmaydi** — `is_active=false` qilinadi, tarix saqlanadi

**1.2 Universitet verification** (`universities` jadvaliga):
```
source_url · last_verified_at · verification_status · source_reliability · is_active
```

**1.3 Audit log jadvali** — yangi `audit_logs`:
```
id · entity_type (university|scholarship) · entity_id · field_changed ·
old_value · new_value · source (text) · actor (ADMIN|AUTOMATED_SYSTEM|AI|EXTERNAL_SOURCE) ·
timestamp · verification_status
```
- Barcha admin CRUD'lar audit yozadi (lib/audit.ts yordamchi)

**1.4 Konfiguratsiya jadvali** — yangi `app_config` (key-value):
- To'lov narxlari, AI limitlari, refresh interval, free/premium feature ro'yxati
- **Hardcoded qiymatlar shu yerga ko'chiriladi** (PREMIUM_PRICE_UZS va h.k.)

**1.5 Avtomatik yangilash tizimi** (bosqich 0.3 ga bog'liq):
- `src/lib/scraper/sources.ts` — manba adapterlari (official saytlar)
- `src/lib/scraper/pipeline.ts` — DISCOVERED → EXTRACTED → VALIDATION → SOURCE VERIFICATION → CHANGE DETECTION → DB UPDATE → NOTIFICATION
- `src/app/api/cron/refresh/route.ts` — scheduler tomonidan chaqiriladi
- `src/app/api/admin/refresh/route.ts` — admin qo'lda refresh (individual/batch)
- `refresh_jobs` jadvali — log, retry, error tracking
- **Muhim:** avtomatik topilgan ma'lumot `verification_status='unverified'` bilan saqlanadi, admin tasdiqlamasdan "verified" ko'rinmaydi

### BOSQICH 2 — AI arxitekturasi (12-16-bo'limlar)

**2.1 Provider abstraction** — yangi `src/lib/ai/` papka:
```
src/lib/ai/
  index.ts        → aiService (generate/analyze/reviewEssay/answerAdmissionsQuestion/analyzeDocument)
  providers.ts    → OpenAI, Anthropic, Google Gemini, OpenRouter adapterlar
  router.ts       → task → provider mapping (env orqali)
  types.ts
  usage.ts        → token/so'rov hisobi (ai_usage jadvali)
  cache.ts        → takroriy so'rovlarni cache
```
- Env: `AI_PROVIDER_ADMISSIONS`, `AI_PROVIDER_ESSAY`, `AI_PROVIDER_GENERAL`, `AI_PROVIDER_SEARCH`, `AI_PROVIDER_DOCUMENT_ANALYSIS`
- Har provider uchun: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`
- Mavjud `callAI()` `aiService` ga o'raladi — 4 ta route o'zgarmaydi (ichki almashadi)

**2.2 Reliability:**
- AI javobida ma'lumot manbasini belgilash: DB ma'lumoti vs AI maslahati vs "ma'lum emas"
- Grant/universitet faktlarida AI avval DB'ni so'raydi (tool/RAG usuli), bilmasa "ma'lum emas" deydi
- Essay tizimi kengaytiriladi: brainstorming, structure, grammar, clarity, coherence, word count, prompt analysis (yangi route'lar yoki bitta route'ga `mode` parametri)

**2.3 Cost control:**
- `ai_usage` jadvali: user_id, task_type, provider, model, prompt_tokens, completion_tokens, cost_estimate, timestamp
- Free quota / Premium quota (app_config'dan)
- Provider fallback (asosiy provider xato bersa, zaxiraga o'tish)

### BOSQICH 3 — Entitlement tizimi (17-bo'lim)

**3.1 Markazlashgan entitlements:**
- `src/lib/entitlements.ts` — `can(user, feature)` funksiyasi
- `app_config` dan feature→plan mapping (admin o'zgartira oladi)
- `PremiumGate` ichki ishlatadi, lekin boshqa joylarda ham ishlatiladi

### BOSQICH 4 — To'lov (18-bo'lim)

**4.1 Payme/Click production:**
- Narxlar `app_config` dan (hardcoded 59000 olib tashlanadi)
- Subscription renewal, failed payment, cancellation, refund status logikasi
- Webhook'larda backend tekshiruvi (mavjud, kengaytiriladi)
- `subscriptions` jadvaliga: `renewal_attempts`, `last_renewal_at`, `refund_status`

### BOSQICH 5 — Notification + Deadline Center (20-21-bo'limlar)

**5.1** `notifications` jadvali + `notification_preferences` jadvali + `notification_templates`
- In-app (birinchi navbatda), email (agar SMTP sozlansa)
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/preferences`

**5.2** `deadline_center`: `GET /api/deadlines?profileId=` — birlashtirilgan timeline:
- University deadlines (universities + savedUniversities)
- Scholarship deadlines (scholarships lifecycle statuslari)
- Test deadlines (IELTS/SAT registrations — app_config'da)
- User milestones (applicationTasks)
- Har bir item: date, type, source, status, days_remaining

### BOSQICH 6 — Roadmap + Document checklist (24-25-bo'limlar)

**6.1** `application_documents` jadvali: profile_id, entity_type (university/scholarship), entity_id, document_type, required (data'dan), status, uploaded_url, custom
- Document turlari har bir university/scholarship data'sidan keladi (hardcode emas)

**6.2** Roadmap dinamik: `applicationTasks` + avtomatik generatsiya (tanlangan university/scholarship bo'yicha)

### BOSQICH 7 — Admin ish oqimi (10-bo'lim)

**7.1** AdminPanel'ga yangi tab'lar:
- **Discovery Review** — avtomatik topilgan grantlarni ko'rish, field-level diff, approve/reject
- **Change History** — audit_logs ni ko'rish (filter: entity, actor, date)
- **Refresh Center** — job'lar, retry, loglar
- **Config Manager** — app_config ni tahrirlash (narxlar, limitlar, feature mapping)

### BOSQICH 8 — Video platforma kengaytmasi (26-bo'lim)

**8.1** `instructor_profiles` jadvali + `courseCategories` + `courses` ga `categoryId`, `studentExperience`, `durationTotal`
- Faqat data arxitektura — real kontent keyin qo'shiladi

### BOSQICH 9 — Konsalting (27-bo'lim)

- Konsalting taklifi: `consulting_requests` jadvali, admin panelda ko'rinadi
- (Bu bo'lim to'liq spetsifikatsiya berilmagan — keyin aniqlashtiriladi)

---

## 3. PRIORITETLAR VA TARTIB

```
BOSQICH 0  →  QAROR: auth + to'lov + scheduler     (sizning javobingiz kerak)
BOSQICH 1  →  Ma'lumotlar yaxlitligi               (eng yuqori qiymat, auth'siz ham bo'ladi)
BOSQICH 2  →  AI arxitektura                       (auth'siz ham bo'ladi)
BOSQICH 3  →  Entitlement                          (auth ga bog'liq)
BOSQICH 4  →  To'lov                               (0.2 qaroriga bog'liq)
BOSQICH 5  →  Notification + Deadline              (auth ga bog'liq)
BOSQICH 6  →  Roadmap + Documents                  (auth ga bog'liq)
BOSQICH 7  →  Admin                                (1-bosqichdan keyin)
BOSQICH 8-9 → Video + Konsalting                   (oxirgi)
```

## 4. XAVFSIZLIK TEKSHIRUVI (19-bo'lim — hozirgi holat)

| Xavf | Holat |
|---|---|
| API key'lar frontend'da | ✅ Server-side (OPENROUTER_API_KEY faqat server) |
| Admin route himoyasi | ✅ `isAdmin()` server-side har admin API'da |
| Premium frontend'da ochish | ✅ Server-side tekshiruv (premium/status + admin routes) |
| Password | ⚠️ Parol tizimi yo'q (auth yo'q) — 0.1 qaroriga bog'liq |
| SQL injection | ✅ Drizzle parameterized |
| Sensitive log | ⚠️ Ba'zi xatolar `console.error`'da to'liq ma'lumot — tozalash kerak |
| Rate limiting | ⚠️ AI endpoint'larda yo'q — 2-bosqichda qo'shiladi |
| `next` redirect ochiq | ✅ Sanitize qilingan |

---

## 5. SIZDAN KERAK BO'LGAN QARORLAR

1. **Auth (0.1):** A) Supabase Auth qayta, B) o'zimizniki, C) demo-profillar?
2. **To'lov (0.2):** A) Payme/Click production, B) Stripe, C) ikkalasi?
3. **Scheduler (0.3):** A) Render Cron, B) tashqi cron, C) lazy-check?
4. **Qaysi bosqichdan boshlaymiz?** (tavsiya: 1 — ma'lumotlar yaxlitligi, auth'siz boshlansa bo'ladi)
