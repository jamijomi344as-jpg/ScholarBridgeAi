/**
 * Generic extraction patterns (spec §3E, §9, §10).
 * Zero university-specific branches. Every pattern returns evidence with
 * source URL + exact snippet + confidence.
 */
import type { SourceEvidence } from "./types";
import { AGENT_CONFIG } from "./config";

export interface ExtractCtx {
  url: string;
  title: string;
  sourceType: string;
  sourceYear?: string;
}

function ev(
  ctx: ExtractCtx,
  field: string,
  value: unknown,
  exactEvidence: string,
  confidence: number,
  extra: Partial<SourceEvidence> = {}
): SourceEvidence {
  return {
    field,
    value,
    sourceUrl: ctx.url,
    sourceTitle: ctx.title,
    sourceType: ctx.sourceType,
    exactEvidence: exactEvidence.slice(0, 200),
    confidence,
    sourceYear: ctx.sourceYear,
    ...extra,
  };
}

/** First money amount with currency found in text. */
export function extractMoney(
  text: string,
  ctx: ExtractCtx,
  field: string,
  periodDefault = "year"
): SourceEvidence | null {
  const patterns: { re: RegExp; cur: string }[] = [
    { re: /\$\s?([\d,]+(?:\.\d{1,2})?)/, cur: "USD" },
    { re: /£\s?([\d,]+(?:\.\d{1,2})?)/, cur: "GBP" },
    { re: /€\s?([\d,]+(?:\.\d{1,2})?)/, cur: "EUR" },
    { re: /CHF\s?([\d,]+(?:\.\d{1,2})?)/, cur: "CHF" },
    { re: /C\$?\s?([\d,]+(?:\.\d{1,2})?)/, cur: "CAD" },
    { re: /A\$?\s?([\d,]+(?:\.\d{1,2})?)/, cur: "AUD" },
    { re: /HK\$?\s?([\d,]+(?:\.\d{1,2})?)/, cur: "HKD" },
    { re: /S\$?\s?([\d,]+(?:\.\d{1,2})?)/, cur: "SGD" },
    { re: /¥\s?([\d,]+(?:\.\d{1,2})?)/, cur: "JPY" },
    { re: /₩\s?([\d,]+(?:\.\d{1,2})?)/, cur: "KRW" },
    { re: /(?:USD|US\$)\s?([\d,]+(?:\.\d{1,2})?)/, cur: "USD" },
    { re: /(?:GBP)\s?([\d,]+(?:\.\d{1,2})?)/, cur: "GBP" },
  ];
  // Context window: look for the field keyword near a money amount.
  const lines = text.split("\n");
  for (const line of lines) {
    const low = line.toLowerCase();
    if (!low.includes("tuition") && !low.includes("fee") && !low.includes("cost") && !low.includes("living") && !low.includes("accommodation")) continue;
    for (const p of patterns) {
      const m = p.re.exec(line);
      if (m) {
        const amount = parseFloat(m[1].replace(/,/g, ""));
        if (amount > 0 && amount < 2_000_000) {
          const period = /per (year|semester|term|month)|annual|yearly/i.test(line) ? "year" : periodDefault;
          return ev(ctx, field, amount, line.trim(), 0.72, { currency: p.cur, period });
        }
      }
    }
  }
  return null;
}

/** Numeric requirement extraction (IELTS/TOEFL/DET/PTE/Cambridge/SAT/ACT/GPA). */
export function extractNumberReq(
  text: string,
  ctx: ExtractCtx,
  field: string,
  label: string
): SourceEvidence | null {
  const re = new RegExp(
    `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:score|iBT|DET|Academic|English)?\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)`,
    "i"
  );
  const m = re.exec(text);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const line = text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20).replace(/\s+/g, " ");
  return ev(ctx, field, value, line, 0.8);
}

/** Detect "X required" statements (SAT/ACT) — NOT a score. */
export function extractRequiredFlag(
  text: string,
  ctx: ExtractCtx,
  field: string,
  label: string
): SourceEvidence | null {
  const re = new RegExp(`${label}\\s*(?:or\\s+ACT|\\/ACT)?[^.]{0,60}required`, "i");
  const m = re.exec(text);
  if (!m) return null;
  return ev(ctx, field, true, m[0].trim().slice(0, 200), 0.75);
}

/** Founded year (4 digits in a "founded in" context). */
export function extractFoundedYear(text: string, ctx: ExtractCtx): SourceEvidence | null {
  const m = /founded\s*(?:in\s*)?(1[5-9]\d\d|20\d\d)/i.exec(text);
  if (!m) return null;
  return ev(ctx, "founded_year", parseInt(m[1], 10), m[0].trim(), 0.85);
}

/** Acceptance rate percentage. */
export function extractAcceptanceRate(text: string, ctx: ExtractCtx): SourceEvidence | null {
  const m = /acceptance\s*rate[^.\d]{0,40}(\d{1,2}(?:\.\d+)?)\s*%/i.exec(text);
  if (!m) return null;
  return ev(ctx, "acceptance_rate", parseFloat(m[1]), m[0].trim().slice(0, 200), 0.8);
}

/** International student count / percentage. */
export function extractIntlStudents(
  text: string,
  ctx: ExtractCtx
): { count?: SourceEvidence; pct?: SourceEvidence } {
  const out: { count?: SourceEvidence; pct?: SourceEvidence } = {};
  const mCount = /international\s+students?[^.\d]{0,40}([\d,]{3,})/i.exec(text);
  if (mCount) out.count = ev(ctx, "international_students_count", parseInt(mCount[1].replace(/,/g, ""), 10), mCount[0].trim().slice(0, 200), 0.7);
  const mPct = /international\s+students?[^.\d]{0,40}(\d{1,3}(?:\.\d+)?)\s*%/i.exec(text);
  if (mPct) out.pct = ev(ctx, "international_students_percentage", parseFloat(mPct[1]), mPct[0].trim().slice(0, 200), 0.7);
  return out;
}

/** Extract ISO dates near deadline keywords. */
export function extractDeadline(text: string, ctx: ExtractCtx): SourceEvidence | null {
  const m = /deadline[^.\d]{0,50}(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i.exec(text);
  if (!m) return null;
  const dateStr = m[1].replace(/(st|nd|rd|th)/g, "");
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return ev(ctx, "deadline", d.toISOString().slice(0, 10), m[0].trim().slice(0, 200), 0.78);
}

/** Classify a link by URL+label patterns. */
export function classifyLink(url: string, label: string): string {
  const l = `${url} ${label}`.toLowerCase();
  if (/apply|admission|portal/.test(l) && /apply|portal/.test(l)) return "application_portal";
  if (/international/.test(l)) return "international_admissions";
  if (/undergraduate|first-year|firstyear/.test(l)) return "undergraduate_admissions";
  if (/admission/.test(l)) return "admissions";
  if (/tuition|fees|cost|financial/.test(l)) return "tuition";
  if (/scholarship|financial.aid|funding/.test(l)) return "scholarships";
  if (/program|degree|major|course/.test(l)) return "programs";
  if (/accommodation|housing|living/.test(l)) return "accommodation";
  if (/requirement|english|ielts|toefl/.test(l)) return "requirements";
  return "other";
}

/** Validate a currency against the allowed set (spec §7). */
export function isAllowedCurrency(c: string | undefined): boolean {
  if (!c) return false;
  return AGENT_CONFIG.allowedCurrencies.has(c.toUpperCase());
}
