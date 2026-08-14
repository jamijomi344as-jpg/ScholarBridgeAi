import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp, AnyPgColumn } from "drizzle-orm/pg-core";

export const studentProfiles = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  degreeLevel: text("degree_level").notNull().default("Master"),
  targetMajor: text("target_major").notNull().default("Computer Science"),
  gpa: doublePrecision("gpa").notNull().default(3.5),
  gpaScale: doublePrecision("gpa_scale").notNull().default(4.0),
  ieltsScore: doublePrecision("ielts_score").default(7.0),
  toeflScore: integer("toefl_score").default(95),
  satScore: integer("sat_score").default(1350),
  greScore: integer("gre_score").default(315),
  budgetAnnualUsd: integer("budget_annual_usd").notNull().default(25000),
  preferredCountries: text("preferred_countries").notNull().default("[\"United States\", \"United Kingdom\", \"Canada\", \"Germany\"]"),
  needScholarship: boolean("need_scholarship").notNull().default(true),
  extracurriculars: text("extracurriculars").default("Hackathon winner, Peer Tutor, Student Council Vice President"),
  workExperienceYears: integer("work_experience_years").default(1),
  researchPublications: integer("research_publications").default(0),
  preferredLocale: text("preferred_locale").notNull().default("en"),
  isAdmin: boolean("is_admin").notNull().default(false),
  // --- Referral system ---
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by").references((): AnyPgColumn => studentProfiles.id, { onDelete: "set null" }),
  referralPoints: integer("referral_points").notNull().default(0),
  referralRewarded: boolean("referral_rewarded").notNull().default(false),
  // --- Referral-gifted premium (stackable 30-day grants) ---
  isPremium: boolean("is_premium").notNull().default(false),
  premiumUntil: timestamp("premium_until"),
  // --- Onboarding wizard progress ---
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const universities = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  flagEmoji: text("flag_emoji").notNull().default("🌐"),
  worldRanking: integer("world_ranking").notNull(),
  degreeLevel: text("degree_level").notNull().default("All"),
  programMajor: text("program_major").notNull(),
  annualTuitionUsd: integer("annual_tuition_usd").notNull(),
  annualLivingEstUsd: integer("annual_living_est_usd").notNull(),
  minGpa: doublePrecision("min_gpa").notNull().default(3.0),
  minIelts: doublePrecision("min_ielts").notNull().default(6.5),
  minSat: integer("min_sat").default(1200),
  acceptanceRate: doublePrecision("acceptance_rate").notNull(),
  postStudyWorkVisaYears: doublePrecision("post_study_work_visa_years").notNull().default(2.0),
  description: text("description").notNull(),
  highlights: text("highlights").notNull().default("[]"),
  websiteUrl: text("website_url").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  provider: text("provider").notNull(),
  country: text("country").notNull(),
  coverageType: text("coverage_type").notNull().default("Full Tuition + Stipend"),
  amountUsdValue: integer("amount_usd_value").notNull(),
  deadline: text("deadline").notNull(),
  degreeLevels: text("degree_levels").notNull().default("[\"Master\", \"PhD\"]"),
  eligibleMajors: text("eligible_majors").notNull().default("[\"All\"]"),
  minGpa: doublePrecision("min_gpa").default(3.2),
  minIelts: doublePrecision("min_ielts").default(6.5),
  financialNeedBased: boolean("financial_need_based").default(false),
  meritBased: boolean("merit_based").default(true),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  websiteUrl: text("website_url").notNull(),
});

export const savedUniversities = pgTable("saved_universities", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  matchCategory: text("match_category").notNull().default("Match"),
  matchScore: integer("match_score").notNull().default(85),
  status: text("status").notNull().default("Shortlisted"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedScholarships = pgTable("saved_scholarships", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  scholarshipId: integer("scholarship_id").references(() => scholarships.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("Saved"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applicationTasks = pgTable("application_tasks", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  category: text("category").notNull().default("Document Prep"),
  dueDate: text("due_date").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  priority: text("priority").notNull().default("Medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiEvaluations = pgTable("ai_evaluations", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  evaluationType: text("evaluation_type").notNull().default("Profile Analysis"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// ---------------------------------------------------------------------------
// 1. FORUM / COMMUNITY
// ---------------------------------------------------------------------------
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumThreads = pgTable("forum_threads", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => forumCategories.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const forumReplies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").references(() => forumThreads.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  parentReplyId: integer("parent_reply_id").references((): AnyPgColumn => forumReplies.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumLikes = pgTable("forum_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumReports = pgTable("forum_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// ---------------------------------------------------------------------------
// 2. VIDEO COURSES / LESSONS / QUIZZES / CERTIFICATES
// ---------------------------------------------------------------------------
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructorName: text("instructor_name").notNull().default("ScholarBridge Academy"),
  level: text("level").notNull().default("Beginner"),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  content: text("content").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }).notNull(),
  watchedSeconds: integer("watched_seconds").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull().default("Lesson Quiz"),
  passThreshold: integer("pass_threshold").notNull().default(70),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  options: text("options").notNull().default("[]"),
  correctOptionIndex: integer("correct_option_index").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  score: integer("score").notNull().default(0),
  answers: text("answers").notNull().default("[]"),
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  certificateCode: text("certificate_code").notNull().unique(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 3. PAYMENTS (Payme + Click) & SUBSCRIPTIONS
// ---------------------------------------------------------------------------
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id").notNull().default(""),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("UZS"),
  status: text("status").notNull().default("pending"),
  purpose: text("purpose").notNull().default("subscription"),
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  plan: text("plan").notNull().default("premium"),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 4. REFERRALS & GAMIFICATION
// ---------------------------------------------------------------------------
export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  currentLevel: integer("current_level").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pointsLedger = pgTable("points_ledger", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const levels = pgTable("levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  minPoints: integer("min_points").notNull().default(0),
  iconUrl: text("icon_url").notNull().default("🏅"),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  iconUrl: text("icon_url").notNull().default("🎖️"),
  criteria: text("criteria").notNull().default("points"),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  badgeId: integer("badge_id").references(() => badges.id, { onDelete: "cascade" }).notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerProfileId: integer("referrer_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  referredProfileId: integer("referred_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  status: text("status").notNull().default("pending"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
