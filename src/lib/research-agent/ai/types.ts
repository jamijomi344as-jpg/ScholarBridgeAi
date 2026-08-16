/**
 * Research-agent AI provider abstraction (spec §2, §24).
 * The agent depends on this interface — OpenRouter is one implementation,
 * another provider can be added later without touching the agent core.
 */

export interface AIPageInput {
  url: string;
  title: string;
  h1: string;
  headings: string;
  /** Main content with nav/footer/link-labels removed (token-controlled). */
  mainContent: string;
}

export interface PageClassificationResult {
  pageType:
    | "homepage" | "admissions" | "international" | "program" | "tuition"
    | "living_costs" | "scholarship" | "deadline" | "requirements" | "discovery_only";
  confidence: number; // 0..1
  reason: string;
  evidence: string[];
}

export interface AIEvidenceField {
  field: string;
  value: unknown;
  currency?: string;
  period?: string;
  rangeMin?: number;
  rangeMax?: number;
  sourceUrl: string;
  sourceTitle: string;
  evidenceQuote: string;
  confidence: number; // 0..1
}

export interface AIProgram {
  name: string;
  degree?: string;
  duration?: string;
  annualTuition?: number;
  tuitionCurrency?: string;
  url?: string;
  evidenceQuote: string;
  confidence: number;
}

export interface AIRequirement {
  minIelts?: number;
  minToefl?: number;
  minDet?: number;
  minPte?: number;
  minCambridge?: number;
  minSat?: number;
  minAct?: number;
  minGpa?: number;
  ibRequirement?: string;
  aLevelRequirement?: string;
  subjectRequirements?: string;
  interviewRequired?: boolean;
  recommendationRequired?: boolean;
  personalStatementRequired?: boolean;
  otherRequirements?: string;
  evidenceQuote: string;
  confidence: number;
}

export interface AICycle {
  academicYear?: string;
  intake?: string;
  applicationType?: string;
  openingDate?: string;
  deadline?: string;
  deadlineTimezone?: string;
  applicationFee?: number;
  applicationFeeCurrency?: string;
  applicationUrl?: string;
  evidenceQuote: string;
  confidence: number;
}

export interface AIScholarship {
  title?: string;
  provider?: string;
  degreeLevels?: string[];
  eligibleMajors?: string[];
  coverageType?: string;
  amount?: number;
  currency?: string;
  deadline?: string;
  openingDate?: string;
  eligibility?: string;
  requirements?: string;
  financialNeedBased?: boolean;
  meritBased?: boolean;
  evidenceQuote: string;
  confidence: number;
}

export interface AIExtractionResult {
  programs: AIProgram[];
  requirements: AIRequirement[];
  applicationCycles: AICycle[];
  scholarships: AIScholarship[];
  universityFields: Record<string, unknown>;
  evidence: AIEvidenceField[];
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly available: boolean;
  classifyPage(input: AIPageInput): Promise<PageClassificationResult | null>;
  extractPage(input: AIPageInput): Promise<AIExtractionResult | null>;
}

/** Runtime AI session stats (shown in the admin UI, spec §22). */
export interface AISessionStats {
  status: "available" | "unavailable";
  provider: string;
  model: string;
  calls: number;
  fallbacks: number;
  classifiedPages: string[];
  extractedPages: string[];
  rejectedEvidence: { field: string; url: string; reasons: string[] }[];
}
