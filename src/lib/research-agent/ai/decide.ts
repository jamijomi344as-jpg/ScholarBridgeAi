/**
 * Final classification decision (spec §6, §9) — AI priority policy.
 *
 * Order of authority:
 *   1. deterministic hard gates + confidence threshold (>= 0.75)
 *   2. AI semantic classification (only consulted when deterministic is
 *      ambiguous: category "other" OR confidence < 0.75)
 *   3. deterministic fallback — but a weak deterministic result (< 0.75)
 *      is NEVER chosen over a high-confidence AI result, and when AI is
 *      unavailable the weak deterministic result becomes discovery_only.
 *
 * Policy:
 *   AI says "other/discovery_only"          → discovery_only (rule 9)
 *   AI confidence >= 0.85                   → accept if page-type safety gate passes
 *   AI confidence 0.75–0.849                → accept only if deterministic agrees
 *   AI confidence < 0.75                    → never accept (discovery_only unless det strong)
 *   AI unavailable + det < 0.75             → discovery_only (rule 1)
 */

export interface DetResult {
  category: string;
  confidence: number;
}

export interface AiResult {
  pageType: string;
  confidence: number;
}

export interface FinalClassification {
  /** Final category — "other" === discovery_only. */
  category: string;
  confidence: number;
  /** True when the AI was consulted and returned a usable result. */
  aiUsed: boolean;
  /** True when the AI result was unusable/weak/rejected and we fell back. */
  fallbackUsed: boolean;
  reason: string;
}

export const CONFIDENCE_MIN = 0.75;
export const AI_ACCEPT_HIGH = 0.85;

export function decideFinalClassification(
  det: DetResult,
  ai: AiResult | null,
  safetyGate: (category: string) => boolean
): FinalClassification {
  const mapType = (t: string) => (t === "discovery_only" ? "other" : t);
  const detStrong = det.confidence >= CONFIDENCE_MIN && det.category !== "other";

  if (!ai) {
    if (detStrong) {
      return {
        category: det.category,
        confidence: det.confidence,
        aiUsed: false,
        fallbackUsed: false,
        reason: `deterministic classification accepted (conf ${det.confidence.toFixed(2)} >= ${CONFIDENCE_MIN})`,
      };
    }
    return {
      category: "other",
      confidence: det.confidence,
      aiUsed: false,
      fallbackUsed: true,
      reason: `deterministic confidence ${det.confidence.toFixed(2)} < ${CONFIDENCE_MIN} — discovery_only`,
    };
  }

  const aiCat = mapType(ai.pageType);

  // Rule 9: AI explicitly says discovery_only → keep it (never pick the weaker det).
  if (aiCat === "other") {
    return {
      category: "other",
      confidence: Math.max(ai.confidence, 0.5),
      aiUsed: true,
      fallbackUsed: false,
      reason: `AI classified discovery_only (conf ${ai.confidence.toFixed(2)}) — kept over deterministic ${det.category} ${det.confidence.toFixed(2)}`,
    };
  }

  // AI >= 0.85 → accept if the page-type safety gate passes.
  if (ai.confidence >= AI_ACCEPT_HIGH) {
    if (safetyGate(aiCat)) {
      return {
        category: aiCat,
        confidence: ai.confidence,
        aiUsed: true,
        fallbackUsed: false,
        reason: `AI classification accepted (conf ${ai.confidence.toFixed(2)} >= ${AI_ACCEPT_HIGH}, safety gate passed)`,
      };
    }
    return {
      category: detStrong ? det.category : "other",
      confidence: detStrong ? det.confidence : ai.confidence,
      aiUsed: true,
      fallbackUsed: true,
      reason: `AI category '${aiCat}' failed page-type safety gate — ${detStrong ? "kept deterministic" : "discovery_only"}`,
    };
  }

  // AI 0.75–0.849 → accept only when deterministic agrees.
  if (ai.confidence >= CONFIDENCE_MIN) {
    if (detStrong && det.category === aiCat) {
      return {
        category: aiCat,
        confidence: ai.confidence,
        aiUsed: true,
        fallbackUsed: false,
        reason: `AI (conf ${ai.confidence.toFixed(2)}) agrees with deterministic '${det.category}' — accepted`,
      };
    }
    return {
      category: detStrong ? det.category : "other",
      confidence: detStrong ? det.confidence : ai.confidence,
      aiUsed: true,
      fallbackUsed: true,
      reason: `AI confidence ${ai.confidence.toFixed(2)} < ${AI_ACCEPT_HIGH} and deterministic does not agree — ${detStrong ? "kept deterministic" : "discovery_only"}`,
    };
  }

  // AI < 0.75 → never accept the AI category.
  return {
    category: detStrong ? det.category : "other",
    confidence: detStrong ? det.confidence : ai.confidence,
    aiUsed: true,
    fallbackUsed: true,
    reason: `AI confidence ${ai.confidence.toFixed(2)} < ${CONFIDENCE_MIN} — ${detStrong ? "kept deterministic" : "discovery_only"}`,
  };
}
