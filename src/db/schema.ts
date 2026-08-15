import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp, date, jsonb, AnyPgColumn } from "drizzle-orm/pg-core";

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
  shortName: text("short_name"),
  country: text("country").notNull(),
  city: text("city").notNull(),
  flagEmoji: text("flag_emoji").notNull().default("🌐"),
  worldRanking: integer("world_ranking").notNull(),
  degreeLevel: text("degree_level").notNull().default("All"),
  programMajor: text("program_major").notNull(),
  // --- Financial (NULL = not verified, spec §14) ---
  annualTuitionUsd: integer("annual_tuition_usd"),
  annualLivingEstUsd: integer("annual_living_est_usd"),
  tuitionCurrency: text("tuition_currency").notNull().default("USD"),
  applicationFee: integer("application_fee"),
  applicationFeeCurrency: text("application_fee_currency").notNull().default("USD"),
  // --- Academic requirements (NULL = not officially specified) ---
  minGpa: doublePrecision("min_gpa"),
  minIelts: doublePrecision("min_ielts"),
  minToefl: integer("min_toefl"),
  minDuolingo: integer("min_duolingo"),
  minSat: integer("min_sat"),
  minAct: integer("min_act"),
  acceptanceRate: doublePrecision("acceptance_rate"),
  // --- Institutional info ---
  foundedYear: integer("founded_year"),
  universityType: text("university_type"), // Public | Private
  internationalStudentsCount: integer("international_students_count"),
  internationalStudentsPct: doublePrecision("international_students_pct"),
  isEnglishTaught: boolean("is_english_taught").notNull().default(false),
  postStudyWorkVisaYears: doublePrecision("post_study_work_visa_years"),
  postStudyVisaNote: text("post_study_visa_note"),
  // --- Links ---
  undergraduateUrl: text("undergraduate_url"),
  internationalUrl: text("international_url"),
  applicationPlatform: text("application_platform"),
  description: text("description").notNull(),
  highlights: text("highlights").notNull().default("[]"),
  websiteUrl: text("website_url").notNull(),
  imageUrl: text("image_url"),
  // --- Source verification (spec §8) ---
  sourceUrl: text("source_url"),
  lastVerifiedAt: timestamp("last_verified_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  sourceReliability: integer("source_reliability").notNull().default(7),
  isActive: boolean("is_active").notNull().default(true),
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
  // --- Dynamic lifecycle (spec §4) ---
  eligibleCountries: text("eligible_countries").default("[]"),
  fundingType: text("funding_type").default(""),
  tuitionCoverage: text("tuition_coverage").default(""),
  livingAllowance: integer("living_allowance"),
  travelAllowance: integer("travel_allowance"),
  accommodation: text("accommodation").default(""),
  applicationFee: integer("application_fee"),
  englishRequirements: text("english_requirements").default(""),
  requiredDocuments: text("required_documents").default("[]"),
  applicationUrl: text("application_url"),
  // --- Dates & recurrence (spec §4, §7) ---
  openingDate: date("opening_date"),
  deadlineDate: date("deadline_date"),
  deadlineType: text("deadline_type").notNull().default("unknown"),
  deadlineRangeStart: date("deadline_range_start"),
  deadlineRangeEnd: date("deadline_range_end"),
  rounds: text("rounds").default("[]"),
  recurrence: text("recurrence").notNull().default("none"),
  expectedOpeningPeriod: text("expected_opening_period"),
  expectedDeadlinePeriod: text("expected_deadline_period"),
  applicationStatus: text("application_status").notNull().default("unknown"),
  // --- Verification (spec §8, §11) ---
  lastVerifiedAt: timestamp("last_verified_at"),
  lastUpdatedAt: timestamp("last_updated_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  sourceReliability: integer("source_reliability").notNull().default(7),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
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
  // --- Video platform expansion (spec §26) ---
  categoryId: integer("category_id").references((): AnyPgColumn => courseCategories.id, { onDelete: "set null" }),
  instructorId: integer("instructor_id").references((): AnyPgColumn => instructors.id, { onDelete: "set null" }),
  studentExperience: text("student_experience").notNull().default(""),
  durationTotalSeconds: integer("duration_total_seconds").notNull().default(0),
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

// ---------------------------------------------------------------------------
// 5. DATA INTEGRITY & OPERATIONS (spec §5, §9, §10, §11)
// ---------------------------------------------------------------------------

/** Key-value app configuration (prices, limits, schedules, feature mapping). */
export const appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Audit / change history for scholarships & universities (spec §11). */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // university | scholarship
  entityId: integer("entity_id").notNull(),
  fieldChanged: text("field_changed").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  source: text("source"),
  actor: text("actor").notNull().default("ADMIN"), // ADMIN | AUTOMATED_SYSTEM | AI | EXTERNAL_SOURCE
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Scheduled/manual refresh jobs (spec §9). */
export const refreshJobs = pgTable("refresh_jobs", {
  id: serial("id").primaryKey(),
  jobType: text("job_type").notNull(), // scholarship | university | all
  status: text("status").notNull().default("pending"), // pending | running | success | failed
  trigger: text("trigger").notNull().default("manual"), // manual | scheduled | cron
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsChanged: integer("items_changed").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 6. NOTIFICATIONS (spec §20)
// ---------------------------------------------------------------------------
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // scholarship_opened | deadline_approaching | deadline_changed | milestone_due | ai_limit | payment_event | ...
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull().unique(),
  inApp: boolean("in_app").notNull().default(true),
  email: boolean("email").notNull().default(false),
  push: boolean("push").notNull().default(false),
  types: text("types").notNull().default("[\"scholarship_opened\",\"deadline_approaching\",\"deadline_changed\",\"milestone_due\"]"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 7. AI USAGE & COST CONTROL (spec §16)
// ---------------------------------------------------------------------------
export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  taskType: text("task_type").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  costEstimate: doublePrecision("cost_estimate").notNull().default(0),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 8. APPLICATION DOCUMENTS (spec §24)
// ---------------------------------------------------------------------------
export const applicationDocuments = pgTable("application_documents", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(), // university | scholarship | general
  entityId: integer("entity_id"),
  documentType: text("document_type").notNull(), // passport | transcript | diploma | recommendation | statement | cv | test_score | financial | portfolio | custom
  label: text("label").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  status: text("status").notNull().default("missing"), // missing | uploaded | not_required
  fileUrl: text("file_url"),
  deadlineDate: date("deadline_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 9. EDUCATIONAL VIDEO PLATFORM (spec §26)
// ---------------------------------------------------------------------------

/** Course instructors (real students who share their experience). */
export const instructors = pgTable("instructors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio").notNull().default(""),
  photoUrl: text("photo_url"),
  university: text("university"),
  program: text("program"),
  country: text("country"),
  scholarshipName: text("scholarship_name"),
  isVerifiedStudent: boolean("is_verified_student").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Course categories. */
export const courseCategories = pgTable("course_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Course progress history for certificates (spec §26). */
export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  progressPct: integer("progress_pct").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 10. CONSULTING (spec §27)
// ---------------------------------------------------------------------------
export const consultingRequests = pgTable("consulting_requests", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull().default(""),
  preferredContact: text("preferred_contact").notNull().default(""),
  status: text("status").notNull().default("new"), // new | in_review | scheduled | completed | declined
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 11. UNIVERSITY DISCOVERY — RELATED TABLES (spec §15)
// ---------------------------------------------------------------------------

/** Programs offered at a university. */
export const universityPrograms = pgTable("university_programs", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  field: text("field"), // Computer Science, AI, Business...
  degree: text("degree"), // Bachelor's | Master's | PhD
  durationYears: doublePrecision("duration_years"),
  language: text("language"),
  tuitionAmount: integer("tuition_amount"),
  tuitionCurrency: text("tuition_currency").notNull().default("USD"),
  applicationDeadline: date("application_deadline"),
  minIelts: doublePrecision("min_ielts"),
  minSat: integer("min_sat"),
  programUrl: text("program_url"),
  isActive: boolean("is_active").notNull().default(true),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Program-level academic requirements. */
export const programRequirements = pgTable("program_requirements", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => universityPrograms.id, { onDelete: "cascade" }).notNull(),
  requirementType: text("requirement_type").notNull(), // gpa | ielts | toefl | duolingo | sat | act | ib | alevel | documents
  minimumValue: doublePrecision("minimum_value"),
  valueText: text("value_text"),
  notes: text("notes"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Application cycles / deadlines (multiple rounds, exact or estimated). */
export const applicationCycles = pgTable("application_cycles", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  cycleYear: integer("cycle_year").notNull(),
  openingDate: date("opening_date"),
  deadline: date("deadline"),
  deadlineType: text("deadline_type").notNull().default("exact"), // exact | early | regular | late | rolling
  isEstimated: boolean("is_estimated").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Verified sources for a university (spec §13). */
export const universitySources = pgTable("university_sources", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  sourceType: text("source_type").notNull().default("official_university"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Campus information. */
export const campuses = pgTable("campuses", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull().default("Main Campus"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  mapUrl: text("map_url"),
  nearbyAirport: text("nearby_airport"),
  accommodationInfo: text("accommodation_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Real university campus images (spec §10 — no fake images). */
export const universityImages = pgTable("university_images", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isPrimary: boolean("is_primary").notNull().default(false),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
