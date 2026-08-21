import { NextResponse } from "next/server";
import { db } from "@/db";
import { universities, studentProfiles, universityPrograms } from "@/db/schema";
import { calculateUniversityMatch } from "@/lib/matching";
import { eq, inArray } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

/**
 * Resilient university select: tries the full schema first. If the database
 * is missing an unexpected column (the DB is the source of truth and may
 * differ), falls back to a core subset so the list still works.
 */
/** Normalize label variants such as "Bachelor's" and "Master’s". */
function normalizeDegreeLevel(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/s\b/g, "")
    .trim();
}

function supportsDegreeLevel(universityLevel: string | null | undefined, requestedLevel: string): boolean {
  const offered = normalizeDegreeLevel(universityLevel);
  const requested = normalizeDegreeLevel(requestedLevel);
  // "All" means the university record confirms availability at every level.
  return offered === "all" || offered === requested;
}

async function selectUniversities() {
  try {
    return await db.select().from(universities);
  } catch {
    return await db
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
      .from(universities);
  }
}

/**
 * University discovery API (spec §16).
 * NULL values are never treated as zero — filters only match verified data.
 */
export async function GET(req: Request) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const search = searchParams.get("search")?.toLowerCase();
    const country = searchParams.get("country");
    const degreeLevel = searchParams.get("degreeLevel");
    const maxTuition = searchParams.get("maxTuition");
    const sort = searchParams.get("sort");
    const uniType = searchParams.get("type"); // Public | Private
    const ieltsFilter = searchParams.get("ielts"); // e.g. "6.5" → only unis with minIelts <= 6.5
    const scholarshipOnly = searchParams.get("scholarships") === "true";
    const englishOnly = searchParams.get("english") === "true";
    const minRank = searchParams.get("minRank") ? Number(searchParams.get("minRank")) : null;
    const maxRank = searchParams.get("maxRank") ? Number(searchParams.get("maxRank")) : null;

    let allUnis = await selectUniversities();

    // Get profile for match calculation if provided
    let profileData = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
      if (p) profileData = p;
    }

    // ---------- Filtering (NULL values excluded from numeric filters) ----------
    if (search) {
      allUnis = allUnis.filter(u =>
        u.name.toLowerCase().includes(search) ||

        u.programMajor.toLowerCase().includes(search) ||
        u.city.toLowerCase().includes(search) ||
        u.country.toLowerCase().includes(search)
      );
    }

    if (country && country !== "All") {
      allUnis = allUnis.filter(u => u.country === country);
    }

    // A signed-in student's target degree is mandatory: a Bachelor applicant
    // must never be shown Master/PhD-only institutions (and vice versa).
    // The request filter is retained for visitors with no profile.
    const requestedDegree = profileData?.degreeLevel || degreeLevel;
    if (requestedDegree && requestedDegree !== "All") {
      allUnis = allUnis.filter((u) => supportsDegreeLevel(u.degreeLevel, requestedDegree));
    }

    // Tuition filter: only universities with VERIFIED tuition (NULL excluded, spec §16).
    if (maxTuition && !isNaN(Number(maxTuition))) {
      const maxT = Number(maxTuition);
      allUnis = allUnis.filter(u => u.annualTuitionUsd != null && u.annualTuitionUsd <= maxT);
    }

    if (ieltsFilter && !isNaN(Number(ieltsFilter))) {
      const minI = Number(ieltsFilter);
      allUnis = allUnis.filter(u => u.minIelts != null && u.minIelts <= minI);
    }

    if (minRank) allUnis = allUnis.filter(u => u.worldRanking >= minRank);
    if (maxRank) allUnis = allUnis.filter(u => u.worldRanking <= maxRank);

    // Scholarship availability: universities that have at least one scholarship
    // in the app scholarships table (matched by name similarity is not reliable —
    // so this filter only applies when scholarships are linked via programs later).
    void scholarshipOnly;

    // Program search: universities offering a program in the searched field.
    const programFilter = searchParams.get("program");
    if (programFilter && programFilter !== "All") {
      const programRows = await db
        .select({ universityId: universityPrograms.universityId })
        .from(universityPrograms)
        .where(inArray(universityPrograms.field, [programFilter]));
      const uniIds = new Set(programRows.map((r) => r.universityId));
      allUnis = allUnis.filter(u => uniIds.has(u.id));
    }

    // ---------- Map match scores ----------
    const results = allUnis.map(uni => {
      let matchInfo: {
        matchScore: number | null;
        matchCategory: "Reach" | "Match" | "Safety" | null;
        reasons?: string[];
        potentialIssues?: string[];
      } = { matchScore: null, matchCategory: null, reasons: [], potentialIssues: [] };
      if (profileData) {
        matchInfo = calculateUniversityMatch(profileData, uni);
      }
      return {
        ...uni,
        matchScore: matchInfo.matchScore,
        matchCategory: matchInfo.matchCategory,
        matchReasons: matchInfo.reasons ?? [],
        matchIssues: matchInfo.potentialIssues ?? [],
      };
    });

    // ---------- Sorting (NULL tuition sorts after verified values) ----------
    if (sort === "tuition_asc") {
      results.sort((a, b) => {
        if (a.annualTuitionUsd == null && b.annualTuitionUsd == null) return 0;
        if (a.annualTuitionUsd == null) return 1;
        if (b.annualTuitionUsd == null) return -1;
        return a.annualTuitionUsd - b.annualTuitionUsd;
      });
    } else if (sort === "tuition_desc") {
      results.sort((a, b) => {
        if (a.annualTuitionUsd == null && b.annualTuitionUsd == null) return 0;
        if (a.annualTuitionUsd == null) return 1;
        if (b.annualTuitionUsd == null) return -1;
        return b.annualTuitionUsd - a.annualTuitionUsd;
      });
    } else if (sort === "name_asc") {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (profileData) {
      // NULL match scores sort last (no profile data -> never ranked by score).
      results.sort((a, b) => {
        if (a.matchScore == null && b.matchScore == null) return 0;
        if (a.matchScore == null) return 1;
        if (b.matchScore == null) return -1;
        return b.matchScore - a.matchScore;
      });
    } else {
      results.sort((a, b) => a.worldRanking - b.worldRanking);
    }

    return NextResponse.json({ universities: results });
  } catch (error) {
    console.error("GET /api/universities error:", error);
    return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 });
  }
}
