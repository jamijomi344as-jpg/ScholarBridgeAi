/**
 * Update rules (spec §6) — exact comparison with unchanged detection.
 *
 * Decision matrix for a single field:
 *   A. old == NULL, new verified official value            → WRITE (update)
 *   B. old == new (value + currency + period identical)    → SKIP (unchanged)
 *   C. old exists (unverified), new official+verified      → UPDATE
 *   D. old verified, new stronger official source          → UPDATE
 *   E. old verified, new weaker/equal source               → SKIP (keep verified)
 *   F. ambiguous / weak source                             → REVIEW
 *
 * Identical values are NEVER counted as UPDATED.
 */
import type { FieldDecision, WriteAction } from "./types";
import { AGENT_CONFIG } from "./config";
import { toNumber } from "./normalize";

export interface CompareInput {
  field: string;
  dbValue: unknown;
  dbVerified: boolean;
  newValue: unknown;
  sourcePriority: number; // 1 = strongest (official homepage)
  confidence: number;
  sourceYear?: string;
  /** Currency/period of the DB value (money fields only). */
  dbCurrency?: unknown;
  dbPeriod?: unknown;
  /** Currency/period of the new evidence (money fields only). */
  newCurrency?: string;
  newPeriod?: string;
  /** Evidence provenance (included in the decision for the audit report). */
  sourceUrl: string;
  sourceTitle?: string;
  sourceType?: string;
}

/** Numeric/string exact comparison (numbers tolerate float noise only). */
export function valuesIdentical(a: unknown, b: unknown): boolean {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na != null && nb != null) {
    return Math.abs(na - nb) < 0.005;
  }
  if (typeof a === "string" || typeof b === "string") {
    return String(a ?? "") === String(b ?? "");
  }
  return a === b;
}

function decision(
  input: CompareInput,
  action: WriteAction,
  reason: string
): FieldDecision {
  return {
    field: input.field,
    action,
    dbValue: input.dbValue,
    newValue: input.newValue,
    sourceUrl: input.sourceUrl,
    reason,
    currency: input.newCurrency,
    period: input.newPeriod,
    sourceTitle: input.sourceTitle,
    sourceType: input.sourceType,
    confidence: input.confidence,
  };
}

/** True when the DB value and the new evidence are the same fact (value+currency+period). */
function isUnchanged(input: CompareInput): boolean {
  if (input.dbValue === null || input.dbValue === undefined || input.dbValue === "") return false;
  if (input.newValue === null || input.newValue === undefined) return false;
  if (!valuesIdentical(input.dbValue, input.newValue)) return false;
  const cur = (v: unknown) => String(v ?? "").trim().toUpperCase();
  if (input.dbCurrency !== undefined && input.newCurrency !== undefined) {
    if (cur(input.dbCurrency) !== cur(input.newCurrency)) return false;
  }
  if (input.dbPeriod !== undefined && input.newPeriod !== undefined) {
    if (String(input.dbPeriod ?? "").trim().toLowerCase() !== String(input.newPeriod ?? "").trim().toLowerCase()) return false;
  }
  return true;
}

/**
 * Decide write/update/skip/review for a single field.
 * Returns a full FieldDecision with old/new values, currency, source info,
 * confidence and the exact decision reason.
 */
export function compareAndDecide(input: CompareInput): FieldDecision {
  const { field, dbValue, dbVerified, newValue, sourcePriority, confidence } = input;

  const dbEmpty = dbValue === null || dbValue === undefined || dbValue === "";
  const strong = confidence >= AGENT_CONFIG.writeConfidence && sourcePriority <= 5;

  // CASE A: DB NULL + verified official source → write/update
  if (dbEmpty && strong) {
    return decision(input, "write", "CASE A: DB value empty — new verified official value fills the gap");
  }
  if (dbEmpty && !strong) {
    return decision(input, "review", "CASE A: DB value empty but source weak/ambiguous — verify before writing");
  }

  // CASE B: identical value (same currency & period) → never UPDATED
  if (isUnchanged(input)) {
    return decision(input, "skip", "CASE B: unchanged — new value identical to DB value (same currency/period)");
  }

  // CASE C: DB unverified + official verified source → update
  if (!dbEmpty && !dbVerified && strong) {
    return decision(input, "update", "CASE C: DB value unverified — official verified source supersedes it");
  }

  // CASE D: DB verified + clearly stronger official source → update
  if (!dbEmpty && dbVerified && sourcePriority <= 3 && confidence >= AGENT_CONFIG.verifiedConfidence) {
    return decision(input, "update", "CASE D: DB value verified but new source is stronger (higher priority + high confidence)");
  }

  // CASE E: DB verified + weaker/equal source → skip
  if (!dbEmpty && dbVerified) {
    return decision(input, "skip", "CASE E: DB value verified — new source is not clearly stronger; verified data kept");
  }

  // CASE F: ambiguous
  return decision(input, "review", "CASE F: ambiguous — review required");
}

/** Human-readable decision label used in reports. */
export function decisionLabel(a: WriteAction): string {
  switch (a) {
    case "write": return "WRITE (DB was NULL)";
    case "update": return "UPDATED";
    case "skip": return "SKIPPED";
    case "review": return "REVIEW REQUIRED";
  }
}
