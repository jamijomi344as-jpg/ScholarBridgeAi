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
  periodDefault = "year",
  hint?: RegExp
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
  // Context window: look for money keywords near an amount. When a `hint`
  // regex is given (e.g. /tuition|fee/), the line must ALSO match it — this
  // keeps a tuition page's amount from becoming "living costs" evidence
  // (evidence quality, spec §3E).
  const lines = text.split("\n");
  for (const line of lines) {
    const low = line.toLowerCase();
    if (
      !low.includes("tuition") && !low.includes("fee") && !low.includes("cost") &&
      !low.includes("living") && !low.includes("accommodation") &&
      !low.includes("scholarship") && !low.includes("award") && !low.includes("grant")
    ) continue;
    if (hint && !hint.test(low)) continue;
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
/** Words/slugs that denote generic hub or navigation pages — never a program. */
export const GENERIC_PAGE_SLUGS = new Set([
  "study", "studies", "courses", "course", "programmes", "programme", "programs", "program",
  "departments", "department", "faculties", "faculty", "faculties-and-departments",
  "research", "research-and-innovation", "innovation", "about", "about-the-site", "news",
  "events", "contact", "accessibility", "sitemap", "search", "privacy", "terms", "cookies",
  "jobs", "alumni", "staff", "students", "home", "index", "admissions", "admission",
  "apply", "application", "tuition", "fees", "funding", "scholarships", "scholarship",
  "requirements", "accommodation", "international", "undergraduate", "postgraduate",
  "global", "campus", "campuses", "library", "sport", "museums", "business", "login", "signup",
]);

export function isGenericSlug(slug: string): boolean {
  return GENERIC_PAGE_SLUGS.has(slug.toLowerCase());
}

/** Map lowercase degree tokens → canonical display form (BEng, MSc, PhD...). */
const DEGREE_TOKEN_MAP: Record<string, string> = {
  beng: "BEng", meng: "MEng", bsc: "BSc", msc: "MSc", ba: "BA", ma: "MA",
  bba: "BBA", llb: "LLB", llm: "LLM", phd: "PhD", mphil: "MPhil", mres: "MRes",
  mbbs: "MBBS", bmus: "BMus", med: "MEd", bed: "BEd", mba: "MBA",
  pgce: "PGCE", mfa: "MFA", bfa: "BFA",
};

/** Title-case a URL slug into a program name: "computing-beng" → "Computing BEng". */
export function programNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((tok) => {
      const lower = tok.toLowerCase();
      if (DEGREE_TOKEN_MAP[lower]) return DEGREE_TOKEN_MAP[lower];
      return tok.charAt(0).toUpperCase() + tok.slice(1);
    })
    .join(" ");
}

/**
 * Extract a program name from a page title, stripping site-brand and generic
 * trailing segments ("Computing BEng | Study | Imperial College London" →
 * "Computing BEng"). Returns null when no non-generic name is present.
 */
export function programNameFromTitle(title: string): string | null {
  const parts = (title || "")
    .split(/[|–—-]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (/^https?:\/\//i.test(part) || part.includes("/")) continue; // URL, not a name
    if (isGenericSlug(part)) continue;
    if (/university|college|institute|school of/i.test(lower) && parts.length > 1) continue;
    if (lower.length < 4) continue;
    return part;
  }
  return null;
}

export interface ProgramPageValidation {
  ok: boolean;
  name: string | null;
  reason?: string;
}

/**
 * Validate that a crawled page is a REAL program/course page, not a generic
 * hub or navigation page (spec §3E, §23).
 *
 * Required:
 *  - URL is a real HTML/PDF page with a program-like path structure
 *    (contains /courses/, /programme/, /program/, /degree/ ... and the last
 *    path segment is a non-generic course slug)
 *  - page title yields a non-generic program name
 *  - the page content actually contains that program name
 */
export function validateProgramPage(url: string, title: string, text: string): ProgramPageValidation {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, name: null, reason: "invalid URL" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, name: null, reason: "not an HTTP(S) page" };
  }
  const path = u.pathname.toLowerCase();
  const lastSegment = path.split("/").filter(Boolean).pop() || "";

  // 1. Program-like URL structure required (generic hubs rejected).
  const hasProgramPath = /(^|\/)(courses?|programs?|programmes?|degrees?|majors?|pathways?)\//.test(path);
  if (!hasProgramPath || isGenericSlug(lastSegment)) {
    return {
      ok: false,
      name: null,
      reason: isGenericSlug(lastSegment)
        ? `generic hub/navigation page (path ends in '${lastSegment}')`
        : "no program-specific URL structure",
    };
  }

  // 2. Non-generic program name from the title (URL slug as fallback).
  const nameFromTitle = programNameFromTitle(title);
  const name = nameFromTitle || programNameFromSlug(lastSegment);
  if (!name || isGenericSlug(name)) {
    return { ok: false, name: null, reason: "page title is not program-specific" };
  }

  // 3. The page content must contain the program/course name.
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (text && key(name).length >= 4 && !key(text).includes(key(name))) {
    return { ok: false, name: null, reason: "page content does not mention the program name" };
  }

  return { ok: true, name };
}

/**
 * Classify a same-domain page into a research-source category.
 * Categories (spec §3D, §23): homepage, admissions, international, program,
 * tuition, living_costs, scholarship, deadline, requirements.
 * Pages that match nothing are "other" — the caller decides whether they are
 * still useful official HTML/PDF sources.
 */
export function classifyLink(url: string, label: string): string {
  const l = `${url} ${label}`.toLowerCase();
  let path = "";
  try {
    const u = new URL(url);
    path = u.pathname.toLowerCase();
    if (u.pathname === "/" || u.pathname === "") return "homepage";
  } catch {
    // fall through to pattern matching
  }
  const lastSegment = path.split("/").filter(Boolean).pop() || "";
  // Structured program check FIRST: /courses/undergraduate/computing-beng/ is
  // a program page, never an "admissions" or "study hub" page.
  if (
    /(^|\/)(courses?|programs?|programmes?|degrees?|majors?|pathways?)\//.test(path) &&
    !isGenericSlug(lastSegment)
  ) {
    return "program";
  }
  if (/international/.test(l)) return "international";
  if (/undergraduate|first-year|firstyear/.test(l)) return "admissions";
  if (/admission/.test(l)) return "admissions";
  if (/apply|application|deadline|key.dates|important.dates|closing.dates|calendar|entry.requirements.dates/.test(l)) return "deadline";
  // Scholarship BEFORE generic tuition/fees — "fees and funding" pages about
  // scholarships must be scholarship pages, not tuition pages.
  if (/scholarship|bursar/.test(l) && /scholarship|funding|bursar|financial.aid/.test(l)) return "scholarship";
  // Living costs BEFORE tuition — "living costs" contains "cost" and must
  // not be misread as a tuition page.
  if (/living|accommodation|housing/.test(l)) return "living_costs";
  if (/tuition|fees?|cost|financial/.test(l)) return "tuition";
  if (/requirement|english|ielts|toefl|entry.requirement/.test(l)) return "requirements";
  // Generic program hub pages (/courses/, /programmes/) — classified program,
  // but validateProgramPage() rejects them before they become records.
  if (/(^|\/)(courses?|programs?|programmes?|degrees?)(\/|$)/.test(path)) return "program";
  return "other";
}

/** True when a "other"-classified page is still a useful research source
 *  (meaningful human title, not a bare asset or tracking endpoint). */
export function isMeaningfulSourceTitle(title: string): boolean {
  const t = (title || "").trim();
  if (!t || t.length < 6) return false;
  if (/^(home|index|untitled|document|download|404|error|page)$/i.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  return true;
}

/** Validate a currency against the allowed set (spec §7). */
export function isAllowedCurrency(c: string | undefined): boolean {
  if (!c) return false;
  return AGENT_CONFIG.allowedCurrencies.has(c.toUpperCase());
}
