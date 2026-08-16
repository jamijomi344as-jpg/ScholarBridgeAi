/**
 * Validation (spec §4, §14 — verified requires source + evidence + validation).
 */
import type { SourceEvidence } from "./types";
import { isAllowedCurrency } from "./extract";
import { toNumber } from "./normalize";

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

export function validateEvidence(ev: SourceEvidence): ValidationResult {
  const reasons: string[] = [];
  if (!ev.sourceUrl || !/^https?:\/\//.test(ev.sourceUrl)) reasons.push("missing source URL");
  if (ev.confidence <= 0) reasons.push("zero confidence");
  if (ev.currency && !isAllowedCurrency(ev.currency)) reasons.push(`currency not allowed: ${ev.currency}`);

  // Value plausibility per field type.
  const n = toNumber(ev.value);
  switch (ev.field) {
    case "annual_tuition":
    case "annual_living_est":
    case "accommodation_cost":
      if (n == null || n <= 0 || n > 2_000_000) reasons.push("unrealistic amount");
      if (!ev.currency) reasons.push("amount without currency");
      break;
    case "min_ielts":
      if (n == null || n < 1 || n > 9) reasons.push("unrealistic IELTS");
      break;
    case "min_toefl":
      if (n == null || n < 10 || n > 120) reasons.push("unrealistic TOEFL");
      break;
    case "min_det":
      if (n == null || n < 10 || n > 200) reasons.push("unrealistic Duolingo");
      break;
    case "min_sat":
      if (n == null || n < 400 || n > 1600) reasons.push("unrealistic SAT");
      break;
    case "min_act":
      if (n == null || n < 1 || n > 36) reasons.push("unrealistic ACT");
      break;
    case "min_gpa":
      if (n == null || n < 0 || n > 5) reasons.push("unrealistic GPA");
      break;
    case "acceptance_rate":
      if (n == null || n <= 0 || n > 100) reasons.push("unrealistic acceptance rate");
      break;
    case "founded_year":
      if (n == null || n < 1000 || n > new Date().getFullYear() + 1) reasons.push("unrealistic founded year");
      break;
  }

  return { ok: reasons.length === 0, reasons };
}

/** A record may be marked verified only when the source is official-ish AND evidence valid. */
export function canMarkVerified(ev: SourceEvidence): boolean {
  // AI-generated evidence is NEVER auto-verified — verified requires a
  // human-reviewed, source-backed determination (spec §14, §20).
  if (ev.aiGenerated) return false;
  const v = validateEvidence(ev);
  if (!v.ok) return false;
  if (ev.confidence < 0.92) return false;
  const t = ev.sourceType.toLowerCase();
  return (
    t.includes("official") ||
    t.includes("university") ||
    t.includes("government") ||
    t.includes("admission") ||
    t.includes("program") ||
    t.includes("tuition") ||
    t.includes("scholarship")
  );
}
