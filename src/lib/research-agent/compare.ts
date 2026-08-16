/**
 * Update rules (spec §6) — CASE A–E.
 */
import type { FieldDecision, WriteAction } from "./types";
import { AGENT_CONFIG } from "./config";

export interface CompareInput {
  field: string;
  dbValue: unknown;
  dbVerified: boolean;
  newValue: unknown;
  sourcePriority: number; // 1 = strongest (official university page)
  confidence: number;
  sourceYear?: string;
}

/**
 * Decide write/update/skip/review for a single field.
 *
 * CASE A: DB NULL + verified official source  → write
 * CASE B: DB exists, unverified + official source → update
 * CASE C: DB exists, verified + same/stronger source → update only if clearly newer
 * CASE D: weaker/ambiguous source → skip + review
 * CASE E: not found → leave NULL (handled by caller)
 */
export function compareAndDecide(input: CompareInput): FieldDecision {
  const { field, dbValue, dbVerified, newValue, sourcePriority, confidence } = input;

  const dbEmpty = dbValue === null || dbValue === undefined || dbValue === "";
  const strong = confidence >= AGENT_CONFIG.writeConfidence && sourcePriority <= 5;

  if (dbEmpty && strong) {
    return { field, action: "write", dbValue, newValue, sourceUrl: "", reason: "CASE A: DB empty + official source" };
  }
  if (dbEmpty && !strong) {
    return { field, action: "review", dbValue, newValue, sourceUrl: "", reason: "CASE A: DB empty but source weak/ambiguous" };
  }
  if (!dbEmpty && !dbVerified && strong) {
    return { field, action: "update", dbValue, newValue, sourceUrl: "", reason: "CASE B: DB unverified + official source" };
  }
  if (!dbEmpty && dbVerified && sourcePriority <= 3 && confidence >= 0.92) {
    return { field, action: "update", dbValue, newValue, sourceUrl: "", reason: "CASE C: verified + stronger official source" };
  }
  if (!dbEmpty && dbVerified) {
    return { field, action: "skip", dbValue, newValue, sourceUrl: "", reason: "CASE C/D: verified data kept — new source not clearly stronger" };
  }
  return { field, action: "review", dbValue, newValue, sourceUrl: "", reason: "CASE D: ambiguous — review required" };
}
