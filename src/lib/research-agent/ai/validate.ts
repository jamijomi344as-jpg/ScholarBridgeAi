/**
 * AI evidence validation (spec §13, §14, §9).
 *
 * AI output is NEVER trusted by itself. Every AI-extracted field passes:
 *  1. evidenceQuote exists in the fetched page text
 *  2. sourceUrl matches the fetched page URL
 *  3. field is in the allowed set
 *  4. page type is appropriate for the field
 *  5. middle-50% scores are never treated as minimums
 *  6. currency is preserved (never converted), ranges never become scalars
 *  7. AI confidence is only one signal — verified status is decided by the
 *     source rules (validate.ts / persist.ts), never by AI alone.
 */
import type { AIEvidenceField } from "./types";
import type { SourceEvidence } from "../types";
import { normalizeUrl, toNumber, normalizeCurrency } from "../normalize";

/** Fields the AI may contribute evidence for. */
export const ALLOWED_AI_FIELDS = new Set([
  "annual_tuition", "tuition_currency", "tuition_period",
  "annual_living_est", "living_cost_currency", "living_cost_period",
  "accommodation_cost", "accommodation_cost_currency", "accommodation_cost_period",
  "application_fee", "application_fee_currency",
  "min_ielts", "min_toefl", "min_det", "min_pte", "min_cambridge",
  "min_sat", "min_act", "min_gpa",
  "ib_requirement", "a_level_requirement", "subject_requirements",
  "interview_required", "recommendation_required", "personal_statement_required",
  "other_requirements",
  "deadline", "opening_date",
  "scholarship_amount", "scholarship_deadline",
  "founded_year", "acceptance_rate",
  "international_students_count", "international_students_percentage",
]);

/** Page types that may support each field group. */
const FIELD_PAGE_TYPES: Record<string, string[]> = {
  annual_tuition: ["tuition", "program"],
  annual_living_est: ["living_costs"],
  accommodation_cost: ["living_costs"],
  application_fee: ["deadline", "admissions"],
  min_ielts: ["requirements", "admissions", "international", "program"],
  min_toefl: ["requirements", "admissions", "international", "program"],
  min_det: ["requirements", "admissions", "international", "program"],
  min_pte: ["requirements", "admissions", "international", "program"],
  min_cambridge: ["requirements", "admissions", "international", "program"],
  min_sat: ["requirements", "admissions", "international", "program"],
  min_act: ["requirements", "admissions", "international", "program"],
  min_gpa: ["requirements", "admissions", "international", "program"],
  ib_requirement: ["requirements", "admissions", "international", "program"],
  a_level_requirement: ["requirements", "admissions", "international", "program"],
  subject_requirements: ["requirements", "admissions", "international", "program"],
  interview_required: ["requirements", "admissions", "program"],
  recommendation_required: ["requirements", "admissions", "program"],
  personal_statement_required: ["requirements", "admissions", "program"],
  other_requirements: ["requirements", "admissions", "international", "program"],
  deadline: ["deadline", "admissions"],
  opening_date: ["deadline", "admissions"],
  scholarship_amount: ["scholarship"],
  scholarship_deadline: ["scholarship"],
  founded_year: ["homepage", "international"],
  acceptance_rate: ["homepage", "international"],
  international_students_count: ["homepage", "international"],
  international_students_percentage: ["homepage", "international"],
};

const ALLOWED_CURRENCIES = new Set([
  "USD", "GBP", "EUR", "CHF", "CAD", "AUD", "HKD", "SGD", "JPY", "KRW", "UZS", "NZD", "CNY", "INR",
]);

/** Collapse whitespace so quotes match the fetched text robustly. */
function normalizeText(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function validateAIEvidence(
  ev: AIEvidenceField,
  pageUrl: string,
  pageText: string,
  pageType: string
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const textNorm = normalizeText(pageText);

  // 1. quote must exist in the fetched page text
  const quote = (ev.evidenceQuote || "").trim();
  if (quote.length < 8) {
    reasons.push("evidenceQuote missing or too short");
  } else if (!textNorm.includes(normalizeText(quote))) {
    reasons.push("evidenceQuote not found in page text");
  }

  // 2. source URL must match the fetched page
  if (normalizeUrl(ev.sourceUrl || "") !== normalizeUrl(pageUrl)) {
    reasons.push("sourceUrl does not match the fetched page");
  }

  // 3. allowed field
  if (!ALLOWED_AI_FIELDS.has(ev.field)) {
    reasons.push(`field not allowed for AI evidence: ${ev.field}`);
  }

  // 4. page type appropriate
  const allowedTypes = FIELD_PAGE_TYPES[ev.field];
  if (allowedTypes && !allowedTypes.includes(pageType)) {
    reasons.push(`page type '${pageType}' does not support field '${ev.field}'`);
  }

  // 5. middle-50% guard — never a minimum
  if (/min_(sat|act|gpa)/.test(ev.field) && /\bmiddle\s*-?\s*50\s*%?\b/i.test(quote)) {
    reasons.push("middle-50% score range is not a minimum — rejected");
  }

  // 6. currency / range rules
  if (ev.currency && !ALLOWED_CURRENCIES.has(ev.currency.toUpperCase())) {
    reasons.push(`currency not allowed: ${ev.currency}`);
  }
  if (ev.rangeMin != null || ev.rangeMax != null) {
    reasons.push("range value — never reduced to a scalar; keep in text/notes instead");
  }

  // 7. numeric fields must parse
  if (/^(annual_tuition|annual_living_est|accommodation_cost|application_fee|min_|founded_year|acceptance_rate|international_students_)/.test(ev.field)) {
    if (toNumber(ev.value) == null) {
      reasons.push(`value is not a number: ${String(ev.value)}`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/** Convert a validated AI evidence field into pipeline SourceEvidence (never auto-verified). */
export function aiEvidenceToSourceEvidence(
  ev: AIEvidenceField,
  pageUrl: string,
  pageType: string
): SourceEvidence {
  return {
    field: ev.field,
    value: ev.value,
    currency: normalizeCurrency(ev.currency) ?? undefined,
    period: ev.period,
    sourceUrl: pageUrl,
    sourceTitle: ev.sourceTitle || pageUrl,
    sourceType: `official_${pageType}`,
    exactEvidence: ev.evidenceQuote,
    confidence: ev.confidence,
    aiGenerated: true,
  };
}

/** AI confidence policy (spec §14) — one signal only; verified is decided elsewhere. */
export function aiConfidencePolicy(confidence: number): "write-candidate" | "review" | "weak" {
  if (confidence >= 0.92) return "write-candidate";
  if (confidence >= 0.75) return "review";
  return "weak";
}
