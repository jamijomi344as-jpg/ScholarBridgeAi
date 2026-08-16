/**
 * Research agent — shared types (spec §2, §3, §15).
 */

export type ResearchScope =
  | "university"
  | "programs"
  | "requirements"
  | "tuition"
  | "living_costs"
  | "application_cycles"
  | "scholarships"
  | "sources";

export interface RunRequest {
  universityIds: number[];
  scopes: ResearchScope[];
  /** When true, nothing is written — extraction & decisions are reported only. */
  dryRun?: boolean;
  /** Optional page cap per university (cost control, spec §21). */
  maxPages?: number;
}

export interface SourceEvidence {
  field: string;
  value: unknown;
  currency?: string;
  period?: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceType: string;
  exactEvidence: string;
  confidence: number; // 0..1
  /** Source year/cycle e.g. "2026-27" — never assume next year (spec §8). */
  sourceYear?: string;
}

export interface ExtractedUniversity {
  foundedYear?: number;
  universityType?: string;
  address?: string;
  officialWebsiteUrl?: string;
  admissionsUrl?: string;
  internationalAdmissionsUrl?: string;
  undergraduateAdmissionsUrl?: string;
  applicationUrl?: string;
  applicationFee?: number;
  applicationFeeCurrency?: string;
  internationalStudentsCount?: number;
  internationalStudentsPercentage?: number;
  acceptanceRate?: number;
  annualTuition?: number;
  tuitionCurrency?: string;
  tuitionPeriod?: string;
  annualLivingEst?: number;
  livingCostCurrency?: string;
  livingCostPeriod?: string;
  accommodationCost?: number;
  accommodationCostCurrency?: string;
  accommodationCostPeriod?: string;
  imageUrl?: string;
  highlights?: string[];
}

export interface ExtractedProgram {
  name: string;
  degree?: string;
  field?: string;
  duration?: number;
  durationUnit?: string;
  studyMode?: string;
  language?: string;
  annualTuition?: number;
  tuitionCurrency?: string;
  tuitionPeriod?: string;
  description?: string;
  officialUrl?: string;
  applicationUrl?: string;
}

export interface ExtractedRequirements {
  minIelts?: number;
  minToefl?: number;
  minDet?: number;
  minSat?: number;
  minAct?: number;
  minGpa?: number;
  ibRequirement?: string;
  aLevelRequirement?: string;
  apRequirement?: string;
  subjectRequirements?: string;
  portfolioRequired?: boolean;
  interviewRequired?: boolean;
  recommendationRequired?: boolean;
  personalStatementRequired?: boolean;
  otherRequirements?: string;
  /** True when source says "SAT required" without a published minimum. */
  satRequiredNoMin?: boolean;
  actRequiredNoMin?: boolean;
}

export interface ExtractedCycle {
  academicYear?: string;
  intake?: string;
  applicationType?: string;
  openingDate?: string;
  deadline?: string;
  deadlineTimezone?: string;
  applicationFee?: number;
  applicationFeeCurrency?: string;
  applicationUrl?: string;
  sourceUrl?: string;
}

export interface ExtractedScholarship {
  title: string;
  provider?: string;
  country?: string;
  coverageType?: string;
  amountUsd?: number; // ONLY when source is USD (spec §12)
  deadline?: string;
  degreeLevels?: string[];
  eligibleMajors?: string[];
  minGpa?: number;
  minIelts?: number;
  financialNeedBased?: boolean;
  meritBased?: boolean;
  description?: string;
  requirements?: string;
  websiteUrl?: string;
  applicationUrl?: string;
  fundingType?: string;
  tuitionCoverage?: string;
  livingAllowance?: number;
  travelAllowance?: number;
  accommodation?: string;
  requiredDocuments?: string[];
  englishRequirements?: string;
  deadlineDate?: string;
  deadlineType?: string;
  recurrence?: string;
  expectedOpeningPeriod?: string;
  expectedDeadlinePeriod?: string;
  currency?: string; // original currency when NOT USD
  amountOriginal?: number; // original amount in original currency
}

export interface ExtractionResult {
  university: ExtractedUniversity;
  programs: ExtractedProgram[];
  requirementsByProgram: Record<string, ExtractedRequirements>; // key = normalized program name
  cycles: ExtractedCycle[];
  scholarships: ExtractedScholarship[];
  evidence: SourceEvidence[];
  discoveredUrls: { url: string; title: string; type: string }[];
}

export type WriteAction = "write" | "update" | "skip" | "review";

export interface FieldDecision {
  /** Entity the decision applies to: "university", "program", "program.tuition", ... */
  entity?: string;
  field: string;
  action: WriteAction;
  dbValue: unknown;
  newValue: unknown;
  sourceUrl: string;
  reason: string;
  /** Original currency of newValue (money fields only). */
  currency?: string;
  /** Original period of newValue (money fields only, e.g. "year"). */
  period?: string;
  sourceTitle?: string;
  sourceType?: string;
  confidence?: number;
}

export interface AuditReport {
  universityId: number;
  universityName: string;
  dryRun: boolean;
  updatedFields: FieldDecision[];
  insertedPrograms: string[];
  updatedRequirements: string[];
  insertedCycles: string[];
  insertedScholarships: string[];
  newSources: { url: string; title: string }[];
  /** Fields kept as-is (identical value / weaker source). Strings = reasons. */
  skippedFields: (string | FieldDecision)[];
  reviewRequired: (string | FieldDecision)[];
  /** URLs rejected during discovery/persistence (fonts, css, tracking...). */
  rejectedSources: { url: string; reason: string }[];
  /** Crawled same-domain pages kept for discovery only — NOT persisted as sources. */
  discoveryOnly: { url: string; title: string; type: string; reason: string }[];
  /** Per-page extraction diagnostics ("fetched but nothing extracted" is never silent). */
  debug: ExtractionDebug;
  errors: string[];
  sourcesReadBack: number;
  duplicatesPrevented: number;
}

export interface RunStatus {
  runId: string;
  universityId: number | null;
  state: "idle" | "running" | "complete" | "error";
  progress: string[];
  report: AuditReport | null;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

/** One fetched page — why it did or did not produce extracted values (debug). */
export interface PageFetchNote {
  url: string;
  category: string;
  title: string;
  textLength: number;
  /** Number of evidence entries produced by this page. */
  extracted: number;
  /** When extracted === 0: reason no supported field was extracted. */
  reason?: string;
}

/** Extraction pipeline statistics (debug report, spec §21). */
export interface ExtractionDebug {
  fetchedPages: number;
  classifiedCounts: Record<string, number>;
  extractionCounts: Record<string, number>;
  pageNotes: PageFetchNote[];
}
