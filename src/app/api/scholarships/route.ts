import { NextResponse } from "next/server";
import { db } from "@/db";
import { scholarships, studentProfiles } from "@/db/schema";
import { calculateScholarshipMatch } from "@/lib/matching";
import { withStatus } from "@/lib/scholarshipStatus";
import { eq } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";

export async function GET(req: Request) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const search = searchParams.get("search")?.toLowerCase();
    const country = searchParams.get("country");
    const coverageType = searchParams.get("coverageType");

    let allScholarships = await db.select().from(scholarships);

    let profileData = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
      if (p) profileData = p;
    }

    if (search) {
      allScholarships = allScholarships.filter(s =>
        s.title.toLowerCase().includes(search) ||
        s.provider.toLowerCase().includes(search) ||
        s.country.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search)
      );
    }

    if (country && country !== "All") {
      allScholarships = allScholarships.filter(s => s.country === country);
    }

    if (coverageType && coverageType !== "All") {
      allScholarships = allScholarships.filter(s => s.coverageType.includes(coverageType));
    }

    const results = allScholarships.map(s => {
      let matchInfo = { matchScore: 85, isEligible: true };
      if (profileData) {
        matchInfo = calculateScholarshipMatch(profileData, s);
      }
      // Computed application status from dates (spec §6) — never stale.
      const statusInfo = withStatus(s);
      return {
        ...s,
        matchScore: matchInfo.matchScore,
        isEligible: matchInfo.isEligible,
        computedStatus: statusInfo.computedStatus,
        statusLabel: statusInfo.statusLabel,
        expectedLabel: statusInfo.expectedLabel,
      };
    });

    if (profileData) {
      results.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      results.sort((a, b) => b.amountUsdValue - a.amountUsdValue);
    }

    return NextResponse.json({ scholarships: results });
  } catch (error) {
    console.error("GET /api/scholarships error:", error);
    return NextResponse.json({ error: "Failed to fetch scholarships" }, { status: 500 });
  }
}
