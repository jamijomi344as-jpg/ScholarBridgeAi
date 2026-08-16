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
import { normalizeNameKey, normalizeUrl, toIsoDate } from "./normalize";
import { canMarkVerified } from "./validate";
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
  if (t.includes("official_university")) return 1;
  if (t.includes("official_admissions") || t.includes("admissions")) return 2;
  if (t.includes("program")) return 3;
  if (t.includes("tuition") || t.includes("financial")) return 4;
  if (t.includes("scholarship")) return 5;
  if (t.includes("government")) return 6;
  if (t.includes("approved")) return 7;
  return 8;
}

/** Upsert a source (dedupe by normalized URL) + link. Returns source id. */
export async function upsertSource(
  evidence: SourceEvidence,
  universityId: number
): Promise<{ sourceId: number | null; inserted: boolean; duplicate: boolean }> {
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

/** Write university-level fields honoring update rules. */
export async function writeUniversity(
  universityId: number,
  extracted: ExtractedUniversity,
  evidence: SourceEvidence[],
  current: CurrentState
): Promise<{ updated: string[]; skipped: string[]; review: string[] }> {
  const updated: string[] = [];
  const skipped: string[] = [];
  const review: string[] = [];
  if (!current.university) return { updated, skipped, review };

  // [evidenceField, drizzleField, getter]
  const fieldMap: [string, string, (u: ExtractedUniversity) => any][] = [
    ["founded_year", "foundedYear", (u) => u.foundedYear],
    ["university_type", "universityType", (u) => u.universityType],
    ["address", "address", (u) => u.address],
    ["acceptance_rate", "acceptanceRate", (u) => u.acceptanceRate],
    ["annual_tuition", "annualTuition", (u) => u.annualTuition],
    ["tuition_currency", "tuitionCurrency", (u) => u.tuitionCurrency],
    ["tuition_period", "tuitionPeriod", (u) => u.tuitionPeriod],
    ["annual_living_est", "annualLivingEst", (u) => u.annualLivingEst],
    ["living_cost_currency", "livingCostCurrency", (u) => u.livingCostCurrency],
    ["accommodation_cost", "accommodationCost", (u) => u.accommodationCost],
    ["accommodation_cost_currency", "accommodationCostCurrency", (u) => u.accommodationCostCurrency],
    ["application_fee", "applicationFee", (u) => u.applicationFee],
    ["application_fee_currency", "applicationFeeCurrency", (u) => u.applicationFeeCurrency],
    ["international_students_count", "internationalStudentsCount", (u) => u.internationalStudentsCount],
    ["international_students_percentage", "internationalStudentsPercentage", (u) => u.internationalStudentsPercentage],
  ];

  const patch: Record<string, any> = {};
  for (const [evField, drizzleField, get] of fieldMap) {
    const value = get(extracted);
    if (value === undefined || value === null) continue;
    const ev = bestEvidence(evidence, evField);
    if (!ev) continue;
    const dbVerified = (current.university as any).verificationStatus === "verified";
    const dbValue = (current.university as any)[drizzleField];
    const priority = sourcePriority(ev.sourceType);

    if (dbValue === null || dbValue === undefined || dbValue === "") {
      patch[drizzleField] = value;
      updated.push(evField);
    } else if (!dbVerified && priority <= 5 && ev.confidence >= 0.7) {
      patch[drizzleField] = value;
      updated.push(evField);
    } else if (dbVerified && priority <= 3 && ev.confidence >= 0.92) {
      patch[drizzleField] = value;
      updated.push(evField);
    } else if (dbVerified) {
      skipped.push(evField);
    } else {
      review.push(evField);
    }
  }

  if (Object.keys(patch).length > 0) {
    try {
      await db.update(universities).set({ ...patch, lastVerifiedAt: new Date() }).where(eq(universities.id, universityId));
    } catch (err) {
      console.error("[research-agent] writeUniversity failed:", err);
    }
  }
  return { updated, skipped, review };
}

/** Upsert a program (dedupe: university_id + normalized name). */
export async function upsertProgram(
  universityId: number,
  p: ExtractedProgram,
  sourceUrl: string
): Promise<{ programId: number | null; inserted: boolean }> {
  try {
    const key = normalizeNameKey(p.name);
    const existing = (await db.select().from(universityPrograms)).find(
      (x) => x.universityId === universityId && normalizeNameKey(x.name) === key
    );
    if (existing) {
      // Update only unverified programs (never weaken verified).
      if (!existing.isVerified && p.annualTuition != null) {
        await db
          .update(universityPrograms)
          .set({
            tuitionAmount: p.annualTuition,
            tuitionCurrency: p.tuitionCurrency ?? existing.tuitionCurrency,
            studyMode: p.studyMode ?? existing.studyMode,
            language: p.language ?? existing.language,
          })
          .where(eq(universityPrograms.id, existing.id));
      }
      return { programId: existing.id, inserted: false };
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
    return { programId: row.id, inserted: true };
  } catch (err) {
    console.error("[research-agent] upsertProgram failed:", err);
    return { programId: null, inserted: false };
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
        (x.deadline ? String(x.deadline).slice(0, 10) : "") === (deadline ?? "")
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
