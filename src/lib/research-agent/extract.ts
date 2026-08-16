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
    // Collect every money match on the line with its position, then pick the
    // first match that is NOT part of a range ("£X–£Y" / "$X to $Y").
    // Ranges are never reduced to a scalar — a later scalar on the same line
    // (e.g. "...£1,300–£1,700 per month. Annual costs £14,200 per year.")
    // is still extracted.
    const candidates: { amount: number; cur: string; index: number }[] = [];
    for (const p of patterns) {
      const re = new RegExp(p.re.source, "gi"); // fresh global regex for iteration
      let m: RegExpMatchArray | null;
      while ((m = re.exec(line)) !== null) {
        const amount = parseFloat(m[1].replace(/,/g, ""));
        if (amount > 0 && amount < 2_000_000) {
          candidates.push({ amount, cur: p.cur, index: m.index ?? 0 });
        }
      }
    }
    candidates.sort((a, b) => a.index - b.index);
    for (const c of candidates) {
      const window = line.slice(Math.max(0, c.index - 20), c.index + 20);
      if (isMoneyRange(window)) continue; // this amount is one end of a range
      // Period from the line: "per month" → month, "per year"/"annual" → year.
      const pm = /per (year|semester|term|month)|annual(?:ly)?|yearly/i.exec(line);
      const period = pm ? pm[1] || "year" : periodDefault;
      return ev(ctx, field, c.amount, line.trim(), 0.72, { currency: c.cur, period });
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

/**
 * Content-based page classification (spec §3D, §23) — classification must use
 * URL + title + CONTENT, not URL keywords alone. Returns the best-matching
 * category with its hit count, or null when the page has no strong signals
 * (generic navigation page).
 */

/**
 * MULTI-SIGNAL page classification (spec §3D, §23).
 *
 *
 * A page is NEVER classified from a bare keyword. Signals are scored from:
 *   A. canonical URL path        (strong +50 / weak +12)
 *   B. <title>                   (+25 per hit)
 *   C. H1                        (+25 per hit)
 *   D. H2 headings               (+10 per hit)
 *   E. main content (main/article region, nav/footer REMOVED)  (+8 per hit)
 *   F. category-specific content patterns (+30 — e.g. award amount for
 *      scholarship, degree/duration for program, tuition fees for tuition)
 *   G. negative signals (−40 / hard-block): accessibility/legal/site-meta
 *      pages and "accessibility statement", "skip to content", cookie,
 *      copyright text.
 *
 * Hard gates per category (the user's rules): a page is e.g. `scholarship`
 * ONLY when the URL/title/H1 says scholarship AND the MAIN CONTENT contains
 * scholarship-specific information (award amount, eligibility, number of
 * awards, application info, deadline, recipient criteria). When confidence
 * is weak → `other` (discovery-only is the default).
 */
import type { PageStructure } from "./fetch";

export interface ClassifyResult {
  category: string;
  confidence: number; // 0..1
  signals: string[];
  negatives: string[];
  reason: string;
  /** Raw per-category scores (for ambiguity detection / AI escalation). */
  scores?: Record<string, number>;
}

/** Site-meta / legal / generic navigation URLs — never research categories. */
const META_URL_RE = /(^|\/)(about(-the-site)?|accessibility|privacy|terms|cookies?|sitemap|search|contact|news|events|jobs|alumni|staff|login|signup|legal|complaints?)(\/|$)/i;

/** Strong per-category URL patterns (the path itself targets the topic). */
const URL_STRONG: [string, RegExp][] = [
  ["scholarship", /(^|\/)(scholarships?|bursaries?|scholarship-awards?)(\/|$)/i],
  ["program", /(^|\/)(courses?|programs?|programmes?|degrees?|majors?|pathways?)\/[^/]+\/[a-z0-9]+(-[a-z0-9]+)+[^/]*$/i],
  ["tuition", /(^|\/)(tuition|fees|fee|cost-of-study)(\/|$)/i],
  ["living_costs", /(^|\/)(accommodation|housing|living|cost-of-living)(\/|$)/i],
  ["deadline", /(^|\/)(apply|application|deadlines?|key-dates|important-dates|dates)(\/|$)/i],
  ["admissions", /(^|\/)(admissions?|entry-requirements|how-to-apply)(\/|$)/i],
  ["international", /(^|\/)(international|overseas)(\/|$)/i],
  ["requirements", /(^|\/)(entry-requirements|english-requirements|admission-requirements)(\/|$)/i],
];

/** Weak URL signals (word appears in a path segment). */
const URL_WEAK: [string, RegExp][] = [
  ["scholarship", /scholarship|bursar|funding/i],
  ["program", /courses?|programs?|programmes?|degrees?/i],
  ["tuition", /tuition|fees?|fee/i],
  ["living_costs", /accommodation|housing|living|cost/i],
  ["deadline", /apply|application|deadline|dates?/i],
  ["admissions", /admission|apply|entry/i],
  ["international", /international|overseas/i],
  ["requirements", /requirement|entry|english/i],
];

/** Title/H1/H2 keyword signals per category. */
const TITLE_SIGNALS: [string, RegExp][] = [
  ["scholarship", /\b(scholarships?|bursaries?|funding|financial support|awards?)\b/i],
  ["program", /\b(beng|bsc|meng|msc|ba|ma|mba|phd|degree|programme|program|course)\b/i],
  ["tuition", /\b(tuition|fees?|fee|cost of study)\b/i],
  ["living_costs", /\b(living costs?|accommodation|cost of living|student budget)\b/i],
  ["deadline", /\b(deadline|apply|application|key dates|closing date|UCAS)\b/i],
  ["admissions", /\b(admissions?|how to apply|entry requirements|application process)\b/i],
  ["international", /\b(international students?|overseas|visa|immigration)\b/i],
  ["requirements", /\b(entry requirements?|english language|ielts|toefl)\b/i],
];

/** Category-specific MAIN-CONTENT evidence (hard gate per category). */
const CONTENT_EVIDENCE: [string, RegExp][] = [
  ["scholarship", /\b(award (amount|value)s?|eligib\w+|number of awards?|how to apply|scholarship deadline|recipient\w* criteria|assessment process)\b/i],
  ["program", /\b(degree|duration|entry requirements?|course modules?|UCAS code|course overview|programme structure|teaching and assessment)\b/i],
  ["tuition", /\b(tuition fees?|overseas tuition|home tuition|fees for 20\d\d(-\d\d)?|annual tuition|per year tuition)\b/i],
  ["living_costs", /\b(living costs?|cost of living|monthly expenses?|accommodation (costs?|prices?)|student budget)\b/i],
  ["deadline", /\b(deadline|applications close|closing date|apply by|equal consideration|key dates|UCAS deadline)\b/i],
  ["admissions", /\b(admissions?|application process|how to apply|entry requirements|UCAS)\b/i],
  ["international", /\b(international students?|international applicants?|overseas applicants?|visas?|immigration)\b/i],
  ["requirements", /\b(entry requirements?|english language requirement|ielts|toefl|a-levels?|international baccalaureate|tmua)\b/i],
];

/** Negative main-content phrases (footer/legal boilerplate, not page type). */
const NEGATIVE_CONTENT_RE = /\b(accessibility statement|skip to (main )?content|cookie (policy|notice|preferences)|all rights reserved|©\s*\d{4}|this page was last updated|site map|sitemap)\b/i;

const CATEGORY_LABEL: Record<string, string> = {
  scholarship: "scholarship", program: "program", tuition: "tuition",
  living_costs: "living_costs", deadline: "deadline", admissions: "admissions",
  international: "international", requirements: "requirements", homepage: "homepage",
};

const hits = (text: string, re: RegExp): number => {
  if (!text) return 0;
  const g = new RegExp(re.source, "gi");
  const m = text.match(g);
  return m ? m.length : 0;
};

/** Main-content evidence per category — exported for the AI safety gate. */
export function hasContentEvidenceFor(category: string, mainText: string): boolean {
  const pair = CONTENT_EVIDENCE.find(([c]) => c === category);
  return pair ? pair[1].test(mainText) : true;
}

/** Actual calendar date in main content ("15 October 2026"). */
const HAS_REAL_DATE =
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/i;

/** "deadline ... 2027" / "deadlines for 2027 entry" — clear entry-year deadline wording. */
const HAS_ENTRY_YEAR_DEADLINE = /\bdeadlines?\b[^.\n]{0,70}\b(?:20\d{2}|entry)\b|\b20\d{2}\s+entry\b[^.\n]{0,40}\bdeadlines?\b/i;

export function classifyResearchPage(
  url: string,
  structure: PageStructure,
  label = ""
): ClassifyResult {
  const signals: string[] = [];
  const negatives: string[] = [];

  // ---- G. hard negative: site-meta / legal / generic navigation URLs ----
  try {
    const path = new URL(url).pathname;
    if (META_URL_RE.test(path)) {
      return {
        category: "other",
        confidence: 0.05,
        signals: [],
        negatives: ["site-meta/legal URL pattern"],
        reason: "site-meta/legal/generic navigation page — discovery only",
        scores: {},
      };
    }
  } catch {
    return { category: "other", confidence: 0.05, signals: [], negatives: ["invalid URL"], reason: "invalid URL", scores: {} };
  }

  const titleText = `${structure.title}\n${structure.h1.join("\n")}`;
  const h2Text = structure.h2.join("\n");
  // Link labels ("Tuition fees", "How to apply", "Scholarships") are
  // mini-navigation, not content — classification uses the link-free main text.
  const mainText = structure.mainTextNoLinks || structure.mainText;
  const fullText = `${structure.fullText}\n${label}`;

  if (NEGATIVE_CONTENT_RE.test(mainText)) {
    negatives.push("footer/legal boilerplate detected in content");
  }

  // ---- score each category ----
  const scores: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  const cats = URL_STRONG.map(([c]) => c);
  for (const cat of cats) {
    let score = 0;
    const catSignals: string[] = [];

    // A. URL
    const sUrl = URL_STRONG.find(([c]) => c === cat)?.[1];
    const wUrl = URL_WEAK.find(([c]) => c === cat)?.[1];
    if (sUrl?.test(url)) { score += 50; catSignals.push(`${cat} URL`); }
    else if (wUrl?.test(url)) { score += 12; catSignals.push(`${cat} URL (weak)`); }

    // B/C. title + H1
    const tSig = TITLE_SIGNALS.find(([c]) => c === cat)?.[1];
    if (tSig) {
      const th = hits(titleText, tSig);
      if (th > 0) { score += 25 * th; catSignals.push(`${cat} title/H1`); }
    }

    // D. H2 headings
    if (tSig) {
      const hh = hits(h2Text, tSig);
      if (hh > 0) { score += 10 * hh; catSignals.push(`${cat} H2`); }
    }

    // E. main content (nav/footer removed)
    if (tSig) {
      const ch = Math.min(hits(mainText, tSig), 5);
      if (ch > 0) { score += 8 * ch; catSignals.push(`${cat} main content`); }
    }

    // F. category-specific content evidence
    const ev = CONTENT_EVIDENCE.find(([c]) => c === cat)?.[1];
    if (ev && ev.test(mainText)) {
      score += 30;
      catSignals.push(`${cat} specific content`);
    }

    scores[cat] = score;
    reasons[cat] = catSignals.join(", ");
  }

  // ---- G. content negative weight ----
  if (negatives.length > 0) {
    for (const c of Object.keys(scores)) scores[c] -= 40;
  }
  // Low-structure pages (no main region, thin content) — cap confidence.
  const thinContent = !structure.hasMainRegion || mainText.trim().length < 200;

  // ---- hard gates per category (user rules) ----
  const urlHas = (re: RegExp) => re.test(url);
  const gateScholarship =
    (urlHas(/(scholarships?|bursaries?)/i) || /\b(scholarships?|bursaries?)\b/i.test(titleText)) &&
    CONTENT_EVIDENCE[0][1].test(mainText);
  const gateProgram =
    urlHas(/courses?\/[^/]+\/[a-z0-9]+(-[a-z0-9]+)+/i) &&
    /\b(beng|bsc|meng|msc|ba|ma|mba|phd|degree|programme|program|course)\b/i.test(titleText) &&
    CONTENT_EVIDENCE[1][1].test(mainText);
  // Tuition requires actual fee DATA in main content — a bare "Tuition fees"
  // nav/link label is not enough (user rule 5).
  const gateTuition =
    (/\b(annual tuition|overseas tuition|home tuition|fees for 20\d\d|per year tuition)\b/i.test(mainText)) ||
    (/\btuition fees?\b/i.test(mainText) && /(£|\$|€|usd|gbp| per (year|semester|term|month)|annual|yearly)/i.test(mainText));
  const gateLiving = CONTENT_EVIDENCE[3][1].test(mainText);
  // Deadline requires ACTUAL dates or clear entry-year deadline wording —
  // the bare word "deadline" is never enough (user rule 5).
  const gateDeadline =
    CONTENT_EVIDENCE[4][1].test(mainText) &&
    (HAS_REAL_DATE.test(mainText) || HAS_ENTRY_YEAR_DEADLINE.test(mainText));
  const gateAdmissions = CONTENT_EVIDENCE[5][1].test(mainText);
  // International requires main content ABOUT international students:
  // visa/immigration wording, or the topic mentioned repeatedly (a single
  // "fees for international students" mention is not an international page).
  const intlHits = (mainText.match(/\binternational (students?|applicants?|admissions?)\b|\boverseas\b/gi) || []).length;
  const gateInternational = /visas?|immigration|english language requirements?/i.test(mainText) || intlHits >= 2;
  const gateRequirements = CONTENT_EVIDENCE[7][1].test(mainText);

  const gates: Record<string, boolean> = {
    scholarship: gateScholarship,
    program: gateProgram,
    tuition: gateTuition,
    living_costs: gateLiving,
    deadline: gateDeadline,
    admissions: gateAdmissions,
    international: gateInternational,
    requirements: gateRequirements,
  };

  // Pick best category among gate-passing ones.
  let bestCat: string | null = null;
  let bestScore = 0;
  for (const cat of cats) {
    if (!gates[cat]) continue;
    const s = scores[cat] ?? 0;
    if (s > bestScore) {
      bestCat = cat;
      bestScore = s;
    }
  }

  if (!bestCat) {
    return {
      category: "other",
      confidence: thinContent ? 0.2 : 0.4,
      signals: [],
      negatives: [...negatives, "no strong multi-signal match — gates not satisfied"],
      reason: "discovery only — insufficient multi-signal evidence for any research category",
      scores,
    };
  }

  const confidence = Math.min(0.99, Math.max(0.3, bestScore / 100));

  // RULE 1 (user): NEVER accept a category with confidence < 0.75 —
  // weak deterministic results are discovery_only, never forced.
  if (bestScore < 75) {
    return {
      category: "other",
      confidence,
      signals: (reasons[bestCat] || "").split(", ").filter(Boolean),
      negatives: [...negatives, `confidence ${confidence.toFixed(2)} below 0.75 threshold`],
      reason: `weak deterministic candidate '${bestCat}' (conf ${confidence.toFixed(2)}) — discovery_only per 0.75 threshold`,
      scores,
    };
  }

  return {
    category: bestCat,
    confidence: thinContent ? Math.min(confidence, 0.8) : confidence,
    signals: (reasons[bestCat] || "").split(", ").filter(Boolean),
    negatives,
    reason: `classified ${CATEGORY_LABEL[bestCat]} (score ${bestScore})`,
    scores,
  };
}

/** True when the line contains a money RANGE ("£X–£Y", "$1,200 to $1,500") — ranges are never reduced to a scalar. */
export function isMoneyRange(line: string): boolean {
  const currency = "(?:£|\\$|€|CHF\\s?|C\\$|A\\$|HK\\$|S\\$|¥|₩)";
  return new RegExp(
    `${currency}\\s?[\\d,]+(?:\\.[\\d]{1,2})?\\s*(?:[-–—]|to)\\s*${currency}\\s?[\\d,]+(?:\\.[\\d]{1,2})?`,
    "i"
  ).test(line);
}

/** Extract a text requirement (A-level grades, IB points, TMUA...) → exact snippet as value. */
export function extractTextReq(
  text: string,
  ctx: ExtractCtx,
  field: string,
  pattern: RegExp
): SourceEvidence | null {
  const m = pattern.exec(text);
  if (!m) return null;
  const line = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, " ").trim();
  return ev(ctx, field, m[0].trim().slice(0, 200), line, 0.72);
}

/** Extract an explicit boolean requirement ("an interview", "personal statement required"...). */
export function extractFlagReq(
  text: string,
  ctx: ExtractCtx,
  field: string,
  pattern: RegExp
): SourceEvidence | null {
  const m = pattern.exec(text);
  if (!m) return null;
  const line = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, " ").trim();
  return ev(ctx, field, true, line, 0.7);
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

/** Extract ISO dates near deadline keywords (date before or after the keyword). */
export function extractDeadline(text: string, ctx: ExtractCtx): SourceEvidence | null {
  const DATE = "(\\d{1,2}(?:st|nd|rd|th)?\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4})";
  const patterns = [
    new RegExp(`(?:deadline|apply by|applications close|closing date|equal consideration deadline)[^.\\d]{0,60}${DATE}`, "i"),
    new RegExp(`${DATE}[^.]{0,40}(?:deadline|closing date|applications close|equal consideration)`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    const dateStr = m[1].replace(/(st|nd|rd|th)/g, "");
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    return ev(ctx, "deadline", d.toISOString().slice(0, 10), m[0].trim().slice(0, 200), 0.78);
  }
  return null;
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
  if (/^https?:\/\//i.test(title || "")) return null; // a URL is never a program name
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

/** First meaningful line of a page (usually the H1), brand suffix stripped. */
export function firstHeading(text: string): string | null {
  for (const raw of (text || "").split("\n")) {
    const line = raw.trim();
    if (line.length < 8) continue;
    if (/^(https?:\/\/|©|cookie|menu|skip|search)/i.test(line)) continue;
    return line.replace(/\s*[|–—-]\s*.*$/, "").trim().slice(0, 150);
  }
  return null;
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
