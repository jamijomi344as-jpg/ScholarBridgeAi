# ScholarBridgeAi — Project Definition

**Repository:** `jamijomi344as-jpg/ScholarBridgeAi`
**Latest commit on `main`:** `aca39e3` (admin panel wired into the UI)

---

## 1. What it is (one paragraph)

**ScholarBridgeAi** is an AI-assisted study-abroad platform: a single-page web
application that helps students (target audience: Uzbekistan / Central Asia,
but usable anywhere) discover universities and scholarships, audit their own
profile, draft and review their Statement of Purpose with AI, track
applications, learn from video courses, discuss with peers in a community
forum, earn points/badges, and pay (or receive as a gift) a **Premium**
subscription that unlocks the advanced sections. It is a full-stack Next.js
app with a Postgres database, a server-side API, and a client-side UI that
renders everything on one page with tab navigation.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js **16.2.6** (App Router, Turbopack) |
| Language | TypeScript **5.9.3** (strict mode) |
| UI | React **19.2.6**, Tailwind CSS **4.1.17**, lucide-react icons |
| Database | PostgreSQL (managed **Supabase** / Render Postgres) |
| ORM | **Drizzle ORM 0.45.2** + `node-postgres` (`pg` 8.20) |
| Migrations | `drizzle-kit push --force` (`npm run db:push`) — schema-push style, no migration files |
| AI | Google **Gemini 2.5 Flash** (`gemini-2.5-flash:generateContent`) |
| i18n | `next-intl` — **English / O'zbekcha / Русский** with middleware locale routing |
| Payments | **Payme** and **Click** (UZS processors), webhook-based |
| Extras | `canvas-confetti` (celebrations), custom i18n provider |
| Deployment | **Render.com** blueprint (`render.yaml`), auto-deploy from `main` |

---

## 3. Architecture & how a request flows

```
Browser (React client components)
   │  fetch("/api/...")
   ▼
Next.js App Router API routes (src/app/api/**/route.ts)
   │  Drizzle ORM queries
   ▼
PostgreSQL (student_profiles, universities, courses, payments, ...)
```

- The app is **one page** (`src/app/page.tsx`, a `"use client"` component)
  with a tab-based navigation. Clicking a tab in `Navbar` swaps the rendered
  section — there is no multi-page routing.
- Every screen is a **client component** that calls **REST-style API routes**
  (App Router route handlers) which query the DB via Drizzle.
- **Seeding is lazy and idempotent**: the first time certain API routes are
  hit (e.g. `/api/universities`, `/api/profiles`, `/api/courses`), they call
  `seedDatabase()` / `seedCourses()` which insert demo data **only if the
  tables are empty**. So a fresh deployment gets populated on first visit.
- **No auth system**: profiles are a demo concept — you switch "active
  profile" from a dropdown in the navbar. The admin flag and premium status
  are columns on the profile row (server-side API routes still verify them).
- Middleware rewrites `/en`, `/uz`, `/ru` prefixed paths to the same routes
  and persists the chosen locale in a cookie.

---

## 4. Database (Drizzle schema — ~25 tables)

**Core domain**
- `student_profiles` — students; includes `is_admin` flag, GPA/IELTS/SAT/GRE
  scores, budget, preferred countries, need-scholarship flag
- `universities` — name, country/city, flag emoji, world ranking, degree
  level, major, tuition/living costs, min GPA/IELTS/SAT, acceptance rate,
  post-study-work-visa years, description, highlights (JSON), website, image
- `scholarships` — title, provider, country, coverage type, amount USD,
  deadline, degree levels (JSON), eligible majors (JSON), min GPA/IELTS,
  need-based / merit-based flags, description, requirements, website
- `saved_universities`, `saved_scholarships` — per-profile saved items with
  status, notes, match score/category
- `application_tasks` — roadmap tasks per profile (title, category, due date,
  priority, completed flag)

**Forum**
- `forum_categories`, `forum_threads`, `forum_replies` (self-referencing for
  nested replies), `forum_likes`, `forum_reports`

**Courses & learning**
- `courses` → `course_modules` → `lessons` → `quizzes` → `quiz_questions`
  (all cascade-delete), plus `lesson_progress`, `quiz_attempts`,
  `certificates` (unique certificate codes)

**Payments & premium**
- `payments` (provider: payme/click/gift, status, amount, purpose), and
  `subscriptions` (plan, status active/canceled, `current_period_end`,
  `payment_id`)

**Gamification & referrals**
- `user_points` (total points, level), `points_ledger` (audit trail),
  `levels`, `badges`, `user_badges`, `referrals` (unique referral codes)

---

## 5. Feature-by-feature

### 5.1 Free sections
- **Dashboard & Audit** — profile summary, stats (saved items, tasks), quick
  navigation, profile editor modal.
- **University Explorer** — filterable list; each university is **match
  scored** (`src/lib/matching.ts` → `calculateUniversityMatch`) against the
  active profile (GPA, test scores, budget, preferred countries, scholarship
  need), producing a match score and category (Reach / Match / Safety); save
  universities to the tracker.
- **Scholarship Hub** — same idea; `calculateScholarshipMatch` computes
  eligibility + match score; save scholarships.
- **My Applications (tracker)** — manage saved universities/scholarships,
  change status (Shortlisted → Preparing Application → Submitted → ...),
  remove items.
- **AI Mentor (chat)** — chat with Gemini (`/api/ai/chat`), keeps a short
  conversation history, answers in the app locale.
- **Rewards & Referrals** — points, levels, badges, leaderboard, and a
  referral share card (points awarded per referral).

### 5.2 Premium sections (locked behind `PremiumGate`)
- **AI SOP & Essays** — `AiSopStudio`: draft an SOP from your profile
  (`/api/ai/draft-sop`), review/polish a pasted SOP (`/api/ai/review-sop`),
  evaluate a profile (`/api/ai/evaluate-profile`).
- **Tasks & Roadmap** — `TaskRoadmap`: suggested application tasks + timeline.
- **Community Forum** — categories, threads, replies, likes, reports, and a
  moderator panel. **Non-premium users see only the lock screen — they can
  open the tab but cannot read topics or write anything.**
- **Video Courses** — `CoursesSection` → catalog → player with lessons,
  progress tracking, per-lesson quizzes, and certificate issuance with
  verifiable codes.

### 5.3 Premium gating (how it works)
1. `PremiumGate` (client component) calls `GET /api/premium/status?profileId=`
   on mount.
2. That route uses `findActiveSubscription()` + `subscriptionIsActive()` from
   `src/lib/payments.ts`: a subscription counts as active if its status is
   `"active"` **and** `current_period_end` is in the future.
3. If active → children render. If not → a blurred/disabled preview + lock
   overlay with a "Buy Premium" button that jumps to the Payments tab.

### 5.4 Payments & subscriptions
- `POST /api/payments/initiate` — creates a `payments` row (59 000 UZS,
  purpose `premium`) and returns a checkout URL for **Payme** or **Click**.
- `POST /api/payments/payme/webhook` — full JSON-RPC merchant flow
  (CheckPerformTransaction, CreateTransaction, PerformTransaction,
  CancelTransaction, CheckTransaction, GetStatement).
- `POST /api/payments/click/prepare` + `POST /api/payments/click/complete` —
  Click two-step callback flow with MD5 signature verification.
- On successful payment: `activateSubscription()` marks the payment `paid`
  and inserts a `subscriptions` row (plan `premium`, status `active`,
  `current_period_end = now + 30 days`).
- **Admin gifts**: `POST /api/admin/premium` inserts a zero-amount
  `provider: "gift"`, `purpose: "premium_gift"` payment + a subscription
  with `current_period_end = now + days×86400000`. `DELETE` revokes (status →
  `"canceled"`).

### 5.5 Admin panel
- **Entry:** a profile with `is_admin = true` (auto-promoted: `seedDatabase()`
  promotes the first profile if no admin exists). Selecting that profile in
  the navbar dropdown reveals the **Admin Panel** tab (dark pill, crown icon)
  → `{activeTab === "admin" && <AdminPanel .../>}` renders the panel.
- **Tabs & managers:**
  - *Universities* (indigo) — `UniversitiesManager`: add/edit/delete
    universities.
  - *Courses & Videos* (violet) — `CoursesManager`: create courses with
    nested modules → lessons → quizzes → questions; edit top-level fields;
    delete.
  - *Scholarships* (emerald) — `ScholarshipsManager`: add/edit/delete.
  - *Premium Gifts* (amber) — `PremiumManager`: gift premium by email + days,
    list students with premium badges, revoke access.
- **Admin API routes** (`/api/admin/*`) all verify `isAdmin(adminProfileId)`
  server-side first (403 otherwise):
  - `POST/PATCH/DELETE /api/admin/universities`
  - `POST/PATCH/DELETE /api/admin/scholarships`
  - `GET/POST/PATCH/DELETE /api/admin/courses` (GET returns list, or the full
    nested course when `?id=` is given)
  - `POST/DELETE /api/admin/premium`
  - `GET /api/admin/profiles` (enriched with `isPremium`/`premiumUntil`)

### 5.6 Gamification & referrals
- Actions award points (`awardPoints()` writes `user_points` + a
  `points_ledger` audit row): profile creation, forum activity, course
  completion, referrals, etc.
- Levels (Explorer → Scholar → Achiever → Ambassador) and badges are
  auto-assigned as thresholds are crossed; a leaderboard ranks profiles.

### 5.7 Localization
- `en`, `uz`, `ru` message catalogs under `src/i18n/messages/`, selected via
  `LocaleProvider`; middleware persists the locale cookie and rewrites
  locale-prefixed URLs; the AI prompts are instructed to answer in the
  active locale.

---

## 6. How to run / deploy

```bash
npm install
# set DATABASE_URL (Postgres), optional GEMINI_API_KEY
npm run db:push        # create/update tables from schema.ts
npm run dev            # local dev
npm run build && npm start
```

**Render (production):** `render.yaml` blueprint → managed Postgres +
web service; build command `npm install && npm run db:push && npm run build`;
health check `/api/health`. First visit seeds demo data.

---

## 7. Project structure cheat-sheet

```
src/
├─ app/
│  ├─ page.tsx            # the whole SPA: tabs + section switching
│  ├─ layout.tsx          # root layout, fonts, metadata
│  ├─ middleware.ts       # locale routing (en/uz/ru)
│  └─ api/                # ~45 route handlers
│     ├─ admin/           # admin CRUD (universities, courses, scholarships,
│     │                   #   premium, profiles)
│     ├─ ai/              # chat, draft-sop, evaluate-profile, review-sop
│     ├─ payments/        # initiate, payme/webhook, click/prepare+complete
│     ├─ premium/status/  # { isPremium } check
│     └─ ...              # universities, scholarships, profiles, courses,
│                         #   forum/*, gamification/*, certificates/*, tasks,
│                         #   saved-*, quizzes/attempt, referrals, health
├─ components/            # 30+ client components (one per section + admin/)
├─ db/
│  ├─ index.ts            # Drizzle + pg Pool (DATABASE_URL)
│  ├─ schema.ts           # all ~25 tables
│  └─ seed.ts             # idempotent demo data + admin auto-promotion
├─ lib/                   # gemini, matching, payments, gamification,
│                         #   certificates, referrals, admin (isAdmin)
└─ i18n/                  # LocaleProvider, config, messages (en/uz/ru)
```

---

## 8. Key behaviors to know

- **No login/registration** — profiles are demo rows you switch between.
  Real auth would be the next step; the admin/premium checks are data-driven
  and server-verified.
- **Premium is time-boxed** — `current_period_end` decides access; expired
  subscriptions automatically lock content again.
- **Courses cascade** — deleting a course deletes modules → lessons → quizzes
  → questions (DB `onDelete: cascade`).
- **Seeders are safe** — they only insert when tables are empty, and the
  admin-promotion check runs on every load.
- **Payments are demo-ready** — merchant keys default to demo values; set
  real Payme/Click credentials in env vars to go live.
- **AI is optional at runtime** — `callGemini` returns `""` gracefully if no
  `GEMINI_API_KEY` is set, and routes fall back to canned responses.
