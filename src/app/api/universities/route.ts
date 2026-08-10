import { NextResponse } from "next/server";
import { db } from "@/db";
import { universities, studentProfiles } from "@/db/schema";
import { calculateUniversityMatch } from "@/lib/matching";
import { eq } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export async function GET(req: Request) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const search = searchParams.get("search")?.toLowerCase();
    const country = searchParams.get("country");
    const degreeLevel = searchParams.get("degreeLevel");
    const maxTuition = searchParams.get("maxTuition");

    let allUnis = await db.select().from(universities);

    // Get profile for match calculation if provided
    let profileData = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
      if (p) profileData = p;
    }

    // Filter list
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

    if (degreeLevel && degreeLevel !== "All") {
      allUnis = allUnis.filter(u => u.degreeLevel === "All" || u.degreeLevel === degreeLevel);
    }

    if (maxTuition && !isNaN(Number(maxTuition))) {
      const maxT = Number(maxTuition);
      allUnis = allUnis.filter(u => u.annualTuitionUsd <= maxT);
    }

    // Map match scores
    const results = allUnis.map(uni => {
      let matchInfo = { matchScore: 80, matchCategory: "Match" as "Reach" | "Match" | "Safety" };
      if (profileData) {
        matchInfo = calculateUniversityMatch(profileData, uni);
      }
      return {
        ...uni,
        matchScore: matchInfo.matchScore,
        matchCategory: matchInfo.matchCategory,
      };
    });

    // Sort by match score descending if profile is present, else world ranking ascending
    if (profileData) {
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
