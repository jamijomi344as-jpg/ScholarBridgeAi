/**
 * Persistence with strict safety rules (spec §5, §6, §13, §14).
 * - Never drops existing data.
 * - Dedupe before insert.
 * - Never overwrite verified data with weaker data.
 * - Only verified when source + validation support it.
 */
import { db } from "@/db";
import {
  universities,
  universityPrograms,
  programRequirements,
  applicationCycles,
  scholarships,
  sources,
  universitySources,
  programSources,
  scholarshipSources,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { normalizeNameKey, normalizeUrl, toIsoDate, toNumber } from "./normalize";
import { canMarkVerified } from "./validate";
import { compareAndDecide } from "./compare";
import { rejectSourceReason, isResearchSourceUrl } from "./urlFilter";
import { isMeaningfulSourceTitle } from "./extract";
import type { FieldDecision } from "./types";
import type {
  ExtractedUniversity,
  ExtractedProgram,
  ExtractedRequirements,
  ExtractedCycle,
  ExtractedScholarship,
  SourceEvidence,
} from "./types";

export interface CurrentState {
  university: Record<string, any> | null;
  programs: Record<string, any>[];
  cycles: Record<string, any>[];
  scholarships: Record<string, any>[];
  sourceUrls: Set<string>;
}

/** STEP A — read current DB state (resilient: returns empty on failure). */
export async function readCurrent(universityId: number): Promise<CurrentState> {
  const state: CurrentState = { university: null, programs: [], cycles: [], scholarships: [], sourceUrls: new Set() };
  try {
    const [uni] = await db.select().from(universities).where(eq(universities.id, universityId));
    state.university = uni ?? null;
    const progs = await db.select().from(universityPrograms).where(eq(universityPrograms.universityId, universityId));
    state.programs = progs;
    const cyc = await db.select().from(applicationCycles).where(eq(applicationCycles.universityId, universityId));
    state.cycles = cyc;
    const sch = await db.select().from(scholarships).orderBy(desc(scholarships.id));
    state.scholarships = sch;
    const src = await db.select().from(sources);
    state.sourceUrls = new Set(src.map((s) => normalizeUrl(s.url)));
    return state;
  } catch (err) {
    console.error("[research-agent] readCurrent failed (DB unavailable?):", err);
    return state;
  }
}

/** Best evidence for a field (highest confidence, validated). */
export function bestEvidence(
  evidence: SourceEvidence[],
  field: string
): SourceEvidence | null {
  const matches = evidence
    .filter((e) => e.field === field)
    .sort((a, b) => b.confidence - a.confidence);
  return matches[0] ?? null;
}

/** Source priority: 1 strongest → 8 weakest (spec §5). */
export function sourcePriority(type: string): number {
  const t = type.toLowerCase();
  if (t.includes("official_homepage") || t.includes("official_university")) return 1;
  if (t.includes("admission") || t.includes("international") || t.includes("undergraduate") || t.includes("portal")) return 2;
  if (t.includes("program") || t.includes("requirement") || t.includes("deadline") || t.includes("apply")) return 3;
  if (t.includes("tuition") || t.includes("living") || t.includes("accommodation") || t.includes("financial") || t.includes("cost")) return 4;
  if (t.includes("scholarship") || t.includes("funding") || t.includes("bursar")) return 5;
  if (t.includes("government")) return 6;
  if (t.includes("approved")) return 7;
  return 8;
}

/**
 * Upsert a source (dedupe by normalized URL) + link. Returns source id.
 * Strict source filtering (spec §3D, §21):
 *  - static assets (fonts/css/js/images/tracking) are REJECTED — never stored;
 *  - generic "other" pages are stored only when they are real HTML/PDF pages
 *    with a meaningful title.
 */
export async function upsertSource(
  evidence: SourceEvidence,
  universityId: number
): Promise<{ sourceId: number | null; inserted: boolean; duplicate: boolean; rejected?: string }> {
  const rejectReason = rejectSourceReason(evidence.sourceUrl);
  if (rejectReason) {
    return { sourceId: null, inserted: false, duplicate: false, rejected: rejectReason };
  }
  if (!/^https?:\/\//i.test(evidence.sourceUrl)) {
    return { sourceId: null, inserted: false, duplicate: false, rejected: "not an HTTP(S) URL" };
  }
  const type = (evidence.sourceType || "").toLowerCase();
  if (type.includes("other") && !isMeaningfulSourceTitle(evidence.sourceTitle || "")) {
    return { sourceId: null, inserted: false, duplicate: false, rejected: "generic 'other' page without a meaningful title" };
  }
  try {
    const url = normalizeUrl(evidence.sourceUrl);
    const [existing] = await db.select().from(sources).where(eq(sources.url, url));
    if (existing) {
      // ensure link exists
      const [link] = await db
        .select()
        .from(universitySources)
        .where(and(eq(universitySources.universityId, universityId), eq(universitySources.sourceId, existing.id)));
      if (!link) {
        await db.insert(universitySources).values({
          universityId,
          sourceId: existing.id,
          sourceType: evidence.sourceType,
        });
      }
      return { sourceId: existing.id, inserted: false, duplicate: true };
    }
    const verified = canMarkVerified(evidence);
    const [row] = await db
      .insert(sources)
      .values({
        url,
        title: evidence.sourceTitle || url,
        sourceType: evidence.sourceType,
        isOfficial: evidence.sourceType.toLowerCase().includes("official"),
        isVerified: verified,
        accessedAt: new Date(),
      })
      .returning();
    await db.insert(universitySources).values({
      universityId,
      sourceId: row.id,
      sourceType: evidence.sourceType,
    });
    return { sourceId: row.id, inserted: true, duplicate: false };
  } catch (err) {
    console.error("[research-agent] upsertSource failed:", err);
    return { sourceId: null, inserted: false, duplicate: false };
  }
}

/** University-level field specs: evidence field → DB field (+ currency/period columns). */
export const UNIVERSITY_FIELD_MAP: {
  evField: string;
  dbField: string;
  get: (u: ExtractedUniversity) => any;
  dbCurrencyField?: string;
  dbPeriodField?: string;
}[] = [
  { evField: "founded_year", dbField: "foundedYear", get: (u) => u.foundedYear },
  { evField: "university_type", dbField: "universityType", get: (u) => u.universityType },
  { evField: "address", dbField: "address", get: (u) => u.address },
  { evField: "acceptance_rate", dbField: "acceptanceRate", get: (u) => u.acceptanceRate },
  { evField: "annual_tuition", dbField: "annualTuition", get: (u) => u.annualTuition, dbCurrencyField: "tuitionCurrency", dbPeriodField: "tuitionPeriod" },
  { evField: "annual_living_est", dbField: "annualLivingEst", get: (u) => u.annualLivingEst, dbCurrencyField: "livingCostCurrency", dbPeriodField: "livingCostPeriod" },
  { evField: "accommodation_cost", dbField: "accommodationCost", get: (u) => u.accommodationCost, dbCurrencyField: "accommodationCostCurrency", dbPeriodField: "accommodationCostPeriod" },
  { evField: "application_fee", dbField: "applicationFee", get: (u) => u.applicationFee, dbCurrencyField: "applicationFeeCurrency" },
  { evField: "international_students_count", dbField: "internationalStudentsCount", get: (u) => u.internationalStudentsCount },
  { evField: "international_students_percentage", dbField: "internationalStudentsPercentage", get: (u) => u.internationalStudentsPercentage },
];

/** Money fields: when the amount is written, its currency/period travels with it. */
const MONEY_FIELD_COLUMNS: Record<string, { currency: string; period?: string }> = {
  annual_tuition: { currency: "tuitionCurrency", period: "tuitionPeriod" },
  annual_living_est: { currency: "livingCostCurrency", period: "livingCostPeriod" },
  accommodation_cost: { currency: "accommodationCostCurrency", period: "accommodationCostPeriod" },
  application_fee: { currency: "applicationFeeCurrency" },
};

/**
 * PURE decision step (no DB access) — used by both the real write path and
 * the dry-run path so dry-run reports EXACTLY what a real run would write.
 * Returns one FieldDecision per extracted field with old/new values,
 * currency, source info, confidence and decision reason.
 */
export function decideUniversityFields(
  extracted: ExtractedUniversity,
  evidence: SourceEvidence[],
  current: CurrentState
): FieldDecision[] {
  if (!current.university) return [];
  const dbVerified = current.university.verificationStatus === "verified";
  const decisions: FieldDecision[] = [];
  for (const spec of UNIVERSITY_FIELD_MAP) {
    const value = spec.get(extracted);
    if (value === undefined || value === null) continue;
    const ev = bestEvidence(evidence, spec.evField);
    if (!ev) continue;
    decisions.push(
      compareAndDecide({
        field: spec.evField,
        dbValue: current.university[spec.dbField],
        dbVerified,
        newValue: value,
        sourcePriority: sourcePriority(ev.sourceType),
        confidence: ev.confidence,
        sourceYear: ev.sourceYear,
        dbCurrency: spec.dbCurrencyField ? current.university[spec.dbCurrencyField] : undefined,
        dbPeriod: spec.dbPeriodField ? current.university[spec.dbPeriodField] : undefined,
        newCurrency: ev.currency,
        newPeriod: ev.period,
        sourceUrl: ev.sourceUrl,
        sourceTitle: ev.sourceTitle,
        sourceType: ev.sourceType,
      })
    );
  }
  return decisions;
}

/** Write university-level fields honoring update rules (CASE A–E). */
export async function writeUniversity(
  universityId: number,
  extracted: ExtractedUniversity,
  evidence: SourceEvidence[],
  current: CurrentState
): Promise<{ updated: FieldDecision[]; skipped: FieldDecision[]; review: FieldDecision[] }> {
  if (!current.university) return { updated: [], skipped: [], review: [] };
  const decisions = decideUniversityFields(extracted, evidence, current);

  const patch: Record<string, any> = {};
  for (const d of decisions) {
    if (d.action !== "write" && d.action !== "update") continue;
    const spec = UNIVERSITY_FIELD_MAP.find((s) => s.evField === d.field);
    if (!spec) continue;
    patch[spec.dbField] = d.newValue;
    // Currency/period travel with the amount (only when the evidence has them).
    const money = MONEY_FIELD_COLUMNS[d.field];
    if (money && d.currency) patch[money.currency] = d.currency;
    if (money?.period && d.period) patch[money.period] = d.period;
  }

  if (Object.keys(patch).length > 0) {
    try {
      await db.update(universities).set({ ...patch, lastVerifiedAt: new Date() }).where(eq(universities.id, universityId));
    } catch (err) {
      console.error("[research-agent] writeUniversity failed:", err);
    }
  }
  return {
    updated: decisions.filter((d) => d.action === "write" || d.action === "update"),
    skipped: decisions.filter((d) => d.action === "skip"),
    review: decisions.filter((d) => d.action === "review"),
  };
}

/** Canonical page URL for dedupe: no query/hash/trailing slash, www-stripped. */
export function canonicalPageUrl(url: string): string {
  return normalizeUrl(url).replace(/^https?:\/\/(www\.)/i, "https://");
}

/** Find an existing program row by normalized name OR canonical official URL. */
export function findExistingProgram(
  programs: Record<string, any>[],
  name: string,
  officialUrl: string
): Record<string, any> | null {
  const key = normalizeNameKey(name);
  const urlKey = canonicalPageUrl(officialUrl);
  return (
    programs.find((x) => x.universityId != null && normalizeNameKey(x.name || "") === key) ||
    programs.find((x) => x.programUrl && canonicalPageUrl(String(x.programUrl)) === urlKey) ||
    null
  );
}

/**
 * Upsert a program.
 * Dedupe: university_id + normalized name, PLUS canonical official-URL match
 * (a discovered "Computing BEng" at imperial.ac.uk/... must match an existing
 * "Computing BEng" at www.imperial.ac.uk/...). Returns what WOULD change.
 */
export async function upsertProgram(
  universityId: number,
  p: ExtractedProgram,
  sourceUrl: string
): Promise<{ programId: number | null; inserted: boolean; updated: string[]; unchanged: boolean }> {
  try {
    const existing = findExistingProgram(
      await db.select().from(universityPrograms),
      p.name,
      p.officialUrl || sourceUrl
    );
    if (existing) {
      // Update only unverified programs (never weaken verified) and only
      // when a real field changed.
      const updated: string[] = [];
      if (!existing.isVerified && p.annualTuition != null && toNumber(existing.tuitionAmount) !== p.annualTuition) {
        await db
          .update(universityPrograms)
          .set({
            tuitionAmount: p.annualTuition,
            tuitionCurrency: p.tuitionCurrency ?? existing.tuitionCurrency,
            studyMode: p.studyMode ?? existing.studyMode,
            language: p.language ?? existing.language,
          })
          .where(eq(universityPrograms.id, existing.id));
        updated.push("annual_tuition");
      }
      return { programId: existing.id, inserted: false, updated, unchanged: updated.length === 0 };
    }
    const [row] = await db
      .insert(universityPrograms)
      .values({
        universityId,
        name: p.name,
        degree: p.degree ?? null,
        field: p.field ?? null,
        durationYears: p.duration ?? null,
        durationUnit: p.durationUnit ?? "years",
        studyMode: p.studyMode ?? null,
        language: p.language ?? null,
        tuitionAmount: p.annualTuition ?? null,
        tuitionCurrency: p.tuitionCurrency ?? "USD",
        tuitionPeriod: p.tuitionPeriod ?? "year",
        description: p.description ?? null,
        programUrl: p.officialUrl ?? null,
        applicationUrl: p.applicationUrl ?? null,
        isVerified: false,
        sourceUrl: sourceUrl,
        lastVerifiedAt: new Date(),
      })
      .returning();
    return { programId: row.id, inserted: true, updated: [], unchanged: false };
  } catch (err) {
    console.error("[research-agent] upsertProgram failed:", err);
    return { programId: null, inserted: false, updated: [], unchanged: false };
  }
}

/** Upsert requirements for a program (single row, wide columns). */
export async function upsertRequirements(
  programId: number,
  req: ExtractedRequirements,
  sourceUrl: string,
  sourceYear?: string
): Promise<boolean> {
  try {
    const [existing] = await db
      .select()
      .from(programRequirements)
      .where(eq(programRequirements.programId, programId));
    const yearNote = sourceYear ? ` (source: ${sourceYear})` : "";
    const values: Record<string, any> = {
      minIelts: req.minIelts ?? null,
      minToefl: req.minToefl ?? null,
      minDet: req.minDet ?? null,
      minSat: req.minSat ?? null,
      minAct: req.minAct ?? null,
      minGpa: req.minGpa ?? null,
      ibRequirement: req.ibRequirement ?? null,
      aLevelRequirement: req.aLevelRequirement ?? null,
      apRequirement: req.apRequirement ?? null,
      subjectRequirements: req.subjectRequirements ?? null,
      portfolioRequired: req.portfolioRequired ?? false,
      interviewRequired: req.interviewRequired ?? false,
      recommendationRequired: req.recommendationRequired ?? false,
      personalStatementRequired: req.personalStatementRequired ?? false,
      otherRequirements: req.otherRequirements
        ? `${req.otherRequirements}${yearNote}`.trim()
        : (existing?.otherRequirements ?? null),
      sourceUrl: sourceUrl,
      lastVerifiedAt: new Date(),
    };
    if (existing) {
      if (existing.verificationStatus === "verified") {
        // Only fill NULL fields of verified rows (never overwrite).
        const fill: Record<string, any> = {};
        for (const k of Object.keys(values)) {
          if ((existing as any)[k] == null && values[k] != null) fill[k] = values[k];
        }
        if (Object.keys(fill).length > 0) {
          await db.update(programRequirements).set(fill).where(eq(programRequirements.id, existing.id));
        }
      } else {
        await db.update(programRequirements).set(values).where(eq(programRequirements.id, existing.id));
      }
    } else {
      await db.insert(programRequirements).values({ programId, ...values });
    }
    return true;
  } catch (err) {
    console.error("[research-agent] upsertRequirements failed:", err);
    return false;
  }
}

/** Upsert an application cycle (dedupe: university + academic_year + type + deadline). */
export async function upsertCycle(
  universityId: number,
  c: ExtractedCycle,
  sourceUrl: string
): Promise<{ inserted: boolean; duplicate: boolean }> {
  try {
    const deadline = toIsoDate(c.deadline);
    const existing = (await db.select().from(applicationCycles).where(eq(applicationCycles.universityId, universityId))).find(
      (x) =>
        (x.academicYear ?? "") === (c.academicYear ?? "") &&
        (x.applicationType ?? "") === (c.applicationType ?? "") &&
        (x.deadline ? (toIsoDate(x.deadline) ?? "") : "") === (deadline ?? "")
    );
    if (existing) return { inserted: false, duplicate: true };
    await db.insert(applicationCycles).values({
      universityId,
      academicYear: c.academicYear ?? null,
      intake: c.intake ?? null,
      applicationType: c.applicationType ?? null,
      openingDate: toIsoDate(c.openingDate),
      deadline,
      deadlineTimezone: c.deadlineTimezone ?? null,
      applicationFee: c.applicationFee ?? null,
      applicationFeeCurrency: c.applicationFeeCurrency ?? "USD",
      applicationUrl: c.applicationUrl ?? null,
      sourceUrl: c.sourceUrl ?? sourceUrl,
      verificationStatus: "unverified",
    });
    return { inserted: true, duplicate: false };
  } catch (err) {
    console.error("[research-agent] upsertCycle failed:", err);
    return { inserted: false, duplicate: false };
  }
}

/** Upsert a scholarship (dedupe by normalized title; DB has no university link). */
export async function upsertScholarship(
  s: ExtractedScholarship,
  sourceUrl: string
): Promise<{ inserted: boolean; duplicate: boolean }> {
  try {
    const key = normalizeNameKey(s.title);
    const existing = (await db.select().from(scholarships)).find((x) => normalizeNameKey(x.title) === key);
    if (existing) return { inserted: false, duplicate: true };
    // Currency rule (spec §12): amount_usd_value ONLY when source is USD.
    await db.insert(scholarships).values({
      title: s.title,
      provider: s.provider ?? "",
      country: s.country ?? "Global",
      coverageType: s.coverageType ?? "Full Tuition + Stipend",
      amountUsdValue: s.amountUsd ?? 0,
      deadline: s.deadline ?? "",
      degreeLevels: JSON.stringify(s.degreeLevels ?? ["Master", "PhD"]),
      eligibleMajors: JSON.stringify(s.eligibleMajors ?? ["All"]),
      minGpa: s.minGpa ?? null,
      minIelts: s.minIelts ?? null,
      financialNeedBased: s.financialNeedBased ?? false,
      meritBased: s.meritBased ?? true,
      description: s.description ?? "",
      requirements: s.requirements ?? "",
      websiteUrl: s.websiteUrl ?? sourceUrl,
      eligibleCountries: JSON.stringify([]),
      fundingType: s.fundingType ?? "",
      tuitionCoverage: s.tuitionCoverage ?? "",
      livingAllowance: s.livingAllowance ?? null,
      travelAllowance: s.travelAllowance ?? null,
      accommodation: s.accommodation ?? "",
      applicationFee: null,
      englishRequirements: s.englishRequirements ?? "",
      requiredDocuments: JSON.stringify(s.requiredDocuments ?? []),
      applicationUrl: s.applicationUrl ?? null,
      deadlineDate: toIsoDate(s.deadlineDate) ?? null,
      deadlineType: s.deadlineType ?? "unknown",
      recurrence: s.recurrence ?? "none",
      expectedOpeningPeriod: s.expectedOpeningPeriod ?? null,
      expectedDeadlinePeriod: s.expectedDeadlinePeriod ?? null,
      verificationStatus: "unverified",
      sourceUrl: sourceUrl,
      lastVerifiedAt: new Date(),
      // Non-USD amounts preserved in description (spec §12).
      ...(s.currency && s.currency !== "USD" && s.amountOriginal != null
        ? { description: `${s.description ?? ""}\n\nAmount: ${s.amountOriginal} ${s.currency} (source currency — not converted).`.trim() }
        : {}),
    });
    return { inserted: true, duplicate: false };
  } catch (err) {
    console.error("[research-agent] upsertScholarship failed:", err);
    return { inserted: false, duplicate: false };
  }
}
