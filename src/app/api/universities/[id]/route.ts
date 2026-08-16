import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  universities,
  universityPrograms,
  programRequirements,
  applicationCycles,
  universitySources,
  sources,
} from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

/**
 * University detail API.
 *
 * Works with the EXISTING database layout:
 *  - programs (NOT university_programs)
 *  - program_requirements with wide columns (min_ielts, min_gpa, ...)
 *  - application_cycles WITHOUT cycle_year (year derived from academic_year)
 *  - university_sources with source links; source details joined from `sources`
 *
 * Missing data stays null — the UI shows "Not available" / "Not specified".
 * No verification flags are invented: they come from the DB columns only.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const uniId = parseInt(id, 10);

    let uni;
    try {
      const [row] = await db.select().from(universities).where(eq(universities.id, uniId));
      uni = row;
    } catch {
      // Fallback: core subset if a column is unexpectedly missing.
      const [row] = await db
        .select({
          id: universities.id,
          name: universities.name,
          country: universities.country,
          city: universities.city,
          flagEmoji: universities.flagEmoji,
          worldRanking: universities.worldRanking,
          degreeLevel: universities.degreeLevel,
          programMajor: universities.programMajor,
          annualTuitionUsd: universities.annualTuitionUsd,
          annualLivingEstUsd: universities.annualLivingEstUsd,
          minGpa: universities.minGpa,
          minIelts: universities.minIelts,
          minSat: universities.minSat,
          acceptanceRate: universities.acceptanceRate,
          postStudyWorkVisaYears: universities.postStudyWorkVisaYears,
          description: universities.description,
          highlights: universities.highlights,
          websiteUrl: universities.websiteUrl,
          imageUrl: universities.imageUrl,
          verificationStatus: universities.verificationStatus,
        })
        .from(universities)
        .where(eq(universities.id, uniId));
      uni = row;
    }
    if (!uni) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    // ---------- Programs (existing `programs` table) ----------
    const programs = await db
      .select()
      .from(universityPrograms)
      .where(eq(universityPrograms.universityId, uniId))
      .orderBy(asc(universityPrograms.name));

    // ---------- Program requirements (wide columns → normalized) ----------
    const programsWithReqs = [];
    for (const p of programs) {
      const reqRows = await db
        .select()
        .from(programRequirements)
        .where(eq(programRequirements.programId, p.id));

      const reqs: { requirementType: string; minimumValue: number | null; valueText: string | null }[] = [];
      let programMinIelts: number | null = null;
      let programMinSat: number | null = null;
      let programMinToefl: number | null = null;
      let programMinDet: number | null = null;
      let programMinGpa: number | null = null;
      let programMinAct: number | null = null;
      for (const r of reqRows) {
        if (r.minIelts != null) {
          reqs.push({ requirementType: "ielts", minimumValue: r.minIelts, valueText: null });
          if (programMinIelts == null) programMinIelts = r.minIelts;
        }
        if (r.minToefl != null) {
          reqs.push({ requirementType: "toefl", minimumValue: r.minToefl, valueText: null });
          if (programMinToefl == null) programMinToefl = r.minToefl;
        }
        if (r.minDet != null) {
          reqs.push({ requirementType: "duolingo", minimumValue: r.minDet, valueText: null });
          if (programMinDet == null) programMinDet = r.minDet;
        }
        if (r.minSat != null) {
          reqs.push({ requirementType: "sat", minimumValue: r.minSat, valueText: null });
          if (programMinSat == null) programMinSat = r.minSat;
        }
        if (r.minAct != null) {
          reqs.push({ requirementType: "act", minimumValue: r.minAct, valueText: null });
          if (programMinAct == null) programMinAct = r.minAct;
        }
        if (r.minGpa != null) {
          reqs.push({ requirementType: "gpa", minimumValue: r.minGpa, valueText: null });
          if (programMinGpa == null) programMinGpa = r.minGpa;
        }
        if (r.ibRequirement) reqs.push({ requirementType: "ib", minimumValue: null, valueText: r.ibRequirement });
        if (r.aLevelRequirement) reqs.push({ requirementType: "alevel", minimumValue: null, valueText: r.aLevelRequirement });
        if (r.apRequirement) reqs.push({ requirementType: "ap", minimumValue: null, valueText: r.apRequirement });
        if (r.subjectRequirements) reqs.push({ requirementType: "subject", minimumValue: null, valueText: r.subjectRequirements });
        if (r.otherRequirements) reqs.push({ requirementType: "other", minimumValue: null, valueText: r.otherRequirements });
      }

      const flags = reqRows[0] ?? null;
      programsWithReqs.push({
        id: p.id,
        name: p.name,
        field: p.field,
        degree: p.degree,
        durationYears: p.durationYears != null ? Number(p.durationYears) : null,
        durationUnit: p.durationUnit ?? "years",
        studyMode: p.studyMode,
        language: p.language,
        tuitionAmount: p.tuitionAmount != null ? Number(p.tuitionAmount) : null,
        tuitionCurrency: p.tuitionCurrency,
        tuitionPeriod: p.tuitionPeriod,
        description: p.description,
        applicationDeadline: null,
        minIelts: programMinIelts,
        minToefl: programMinToefl,
        minDuolingo: programMinDet,
        minSat: programMinSat,
        minAct: programMinAct,
        minGpa: programMinGpa,
        portfolioRequired: flags?.portfolioRequired ?? false,
        interviewRequired: flags?.interviewRequired ?? false,
        recommendationRequired: flags?.recommendationRequired ?? false,
        personalStatementRequired: flags?.personalStatementRequired ?? false,
        programUrl: p.programUrl,
        applicationUrl: p.applicationUrl,
        isVerified: p.isVerified,
        requirements: reqs,
      });
    }

    // ---------- University-level requirements (generic aggregation) ----------
    // Collects ALL distinct values per requirement type across programs.
    // If programs disagree (e.g. IELTS 6.5 vs 7.0), we expose the full list
    // and the UI shows "6.5–7.0" instead of guessing a single number.
    const uniReqs: Record<string, { values: (number | null)[]; texts: (string | null)[] }> = {};
    const flagAgg = { portfolio: false, interview: false, recommendation: false, personalStatement: false };
    for (const p of programsWithReqs) {
      for (const r of p.requirements) {
        const key = r.requirementType;
        if (!uniReqs[key]) uniReqs[key] = { values: [], texts: [] };
        if (r.minimumValue != null && !uniReqs[key].values.includes(r.minimumValue)) {
          uniReqs[key].values.push(r.minimumValue);
        }
        if (r.valueText && !uniReqs[key].texts.includes(r.valueText)) {
          uniReqs[key].texts.push(r.valueText);
        }
      }
      flagAgg.portfolio = flagAgg.portfolio || p.portfolioRequired;
      flagAgg.interview = flagAgg.interview || p.interviewRequired;
      flagAgg.recommendation = flagAgg.recommendation || p.recommendationRequired;
      flagAgg.personalStatement = flagAgg.personalStatement || p.personalStatementRequired;
    }

    // Helper: single value, range, or null.
    const summarize = (key: string, uniFallback: number | null) => {
      const vals = [...(uniReqs[key]?.values ?? [])];
      if (uniFallback != null && !vals.includes(uniFallback)) vals.push(uniFallback);
      if (vals.length === 0) return null;
      const sorted = [...vals].filter((v): v is number => v != null).sort((a, b) => a - b);
      return {
        values: sorted,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        range: sorted.length > 1 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : String(sorted[0]),
        single: sorted.length === 1 ? sorted[0] : null,
      };
    };

    const universityRequirements = {
      ielts: summarize("ielts", uni.minIelts),
      toefl: summarize("toefl", null),
      duolingo: summarize("duolingo", null),
      gpa: summarize("gpa", uni.minGpa),
      sat: summarize("sat", uni.minSat),
      act: summarize("act", null),
      pte: summarize("pte", null),
      cambridgeEnglish: summarize("cambridgeenglish", null),
      // Requirement row exists (even without a published minimum):
      satRequired: (uniReqs.sat?.values.length ?? 0) > 0 || uni.minSat != null,
      actRequired: (uniReqs.act?.values.length ?? 0) > 0,
      satMinimumPublished: (uniReqs.sat?.values.length ?? 0) > 0 || uni.minSat != null,
      actMinimumPublished: (uniReqs.act?.values.length ?? 0) > 0,
      portfolioRequired: flagAgg.portfolio,
      interviewRequired: flagAgg.interview,
      recommendationRequired: flagAgg.recommendation,
      personalStatementRequired: flagAgg.personalStatement,
      other: uniReqs.other?.texts ?? [],
      subject: uniReqs.subject?.texts ?? [],
    };

    // ---------- Application cycles (no cycle_year in DB — derive from academic_year) ----------
    const cycleRows = await db
      .select()
      .from(applicationCycles)
      .where(eq(applicationCycles.universityId, uniId))
      .orderBy(asc(applicationCycles.id));

    const cycles = cycleRows.map((c) => {
      let year: number | null = null;
      const m = /^(\d{4})/.exec(c.academicYear || "");
      if (m) year = parseInt(m[1], 10);
      return {
        id: c.id,
        cycleYear: year,
        academicYear: c.academicYear,
        intake: c.intake,
        applicationType: c.applicationType,
        openingDate: c.openingDate,
        deadline: c.deadline,
        deadlineTimezone: c.deadlineTimezone,
        applicationFee: c.applicationFee != null ? Number(c.applicationFee) : null,
        applicationFeeCurrency: c.applicationFeeCurrency,
        applicationUrl: c.applicationUrl,
        isVerified: c.verificationStatus === "verified",
        isEstimated: false,
      };
    });

    // ---------- Sources (resilient: unknown table shape must not crash the page) ----------
    let uniSources: {
      id: number;
      universityId: number;
      sourceId: number | null;
      sourceType: string;
      source: { url: string; title: string; isOfficial: boolean; isVerified: boolean } | null;
    }[] = [];
    try {
      const linkRows = await db
        .select({
          id: universitySources.id,
          universityId: universitySources.universityId,
          sourceId: universitySources.sourceId,
          sourceType: universitySources.sourceType,
        })
        .from(universitySources)
        .where(eq(universitySources.universityId, uniId));

      const srcIds = [...new Set(linkRows.map((r) => r.sourceId).filter((x): x is number => x != null))];
      const srcMap = new Map<number, { url: string; title: string; isOfficial: boolean; isVerified: boolean }>();
      if (srcIds.length) {
        try {
          const rows = await db
            .select({
              id: sources.id,
              url: sources.url,
              title: sources.title,
              isOfficial: sources.isOfficial,
              isVerified: sources.isVerified,
            })
            .from(sources)
            .where(inArray(sources.id, srcIds));
          rows.forEach((r) =>
            srcMap.set(r.id, { url: r.url, title: r.title, isOfficial: r.isOfficial, isVerified: r.isVerified })
          );
        } catch {
          // sources table shape differs — sources are simply not shown.
        }
      }

      uniSources = linkRows.map((r) => ({
        id: r.id,
        universityId: r.universityId,
        sourceId: r.sourceId,
        sourceType: r.sourceType,
        source: r.sourceId != null ? srcMap.get(r.sourceId) ?? null : null,
      }));
    } catch {
      // university_sources table shape differs — sources are simply not shown.
    }

    // ---------- Scholarships linked to this university ----------
    // NOTE: the existing `scholarships` table has no university_id column, so
    // there is no verified link to attach here. Return empty — the UI shows
    // "No verified scholarships linked" instead of guessing.
    const uniScholarships: unknown[] = [];

    return NextResponse.json({
      university: uni,
      universityRequirements,
      programs: programsWithReqs,
      applicationCycles: cycles,
      sources: uniSources,
      scholarships: uniScholarships,
      campuses: [],
      images: [],
    });
  } catch (error) {
    console.error("GET /api/universities/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch university" }, { status: 500 });
  }
}
