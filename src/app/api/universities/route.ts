import { NextResponse } from "next/server";
import { db } from "@/db";
import { universities, studentProfiles, universityPrograms } from "@/db/schema";
import { calculateUniversityMatch } from "@/lib/matching";
import { eq, inArray } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

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

    let allUnis = await db.select().from(universities);

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
        (u.shortName || "").toLowerCase().includes(search) ||
        u.programMajor.toLowerCase().includes(search) ||
        u.city.toLowerCase().includes(search) ||
        u.country.toLowerCase().includes(search)
      );
    }

    if (country && country !== "All") {
      allUnis = allUnis.filter(u => u.country === country);
    }

    if (degreeLevel && degreeLevel !== "All") {
      allUnis = allUnis.filter(u => u.degreeLevel === "All" || u.degreeLevel === degreeLevel);
    }

    // Tuition filter: only universities with VERIFIED tuition (NULL excluded, spec §16).
    if (maxTuition && !isNaN(Number(maxTuition))) {
      const maxT = Number(maxTuition);
      allUnis = allUnis.filter(u => u.annualTuitionUsd != null && u.annualTuitionUsd <= maxT);
    }

    if (uniType && uniType !== "All") {
      allUnis = allUnis.filter(u => u.universityType === uniType);
    }

    if (ieltsFilter && !isNaN(Number(ieltsFilter))) {
      const minI = Number(ieltsFilter);
      allUnis = allUnis.filter(u => u.minIelts != null && u.minIelts <= minI);
    }

    if (englishOnly) {
      allUnis = allUnis.filter(u => u.isEnglishTaught === true);
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
        matchScore: number;
        matchCategory: "Reach" | "Match" | "Safety";
        reasons?: string[];
        potentialIssues?: string[];
      } = { matchScore: 80, matchCategory: "Match", reasons: [], potentialIssues: [] };
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
      results.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      results.sort((a, b) => a.worldRanking - b.worldRanking);
    }

    return NextResponse.json({ universities: results });
  } catch (error) {
    console.error("GET /api/universities error:", error);
    return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 });
  }
}
