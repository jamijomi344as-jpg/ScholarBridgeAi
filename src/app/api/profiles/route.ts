import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import { awardPoints } from "@/lib/gamification";
import { ensureReferralCode, applyReferralCodeToProfile } from "@/lib/referrals";

/** Detect a schema-mismatch error (new columns missing in the database). */
function isMissingColumnsError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err);
  return (
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("referral_code") ||
    msg.includes("onboarding_step")
  );
}

export async function GET() {
  try {
    await seedDatabase();
    const profiles = await db.select().from(studentProfiles);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("GET /api/profiles error:", error);
    if (isMissingColumnsError(error)) {
      return NextResponse.json(
        {
          error:
            "Database schema is out of date. The application is configured to NEVER modify the database automatically. Please review the app schema vs your Supabase schema and align them manually.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to fetch student profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Parse preferredCountries if passed as array
    let countriesStr = "[\"United States\", \"United Kingdom\", \"Canada\"]";
    if (body.preferredCountries) {
      if (typeof body.preferredCountries === "string") {
        countriesStr = body.preferredCountries;
      } else {
        countriesStr = JSON.stringify(body.preferredCountries);
      }
    }

    // NEVER fabricate academic data (spec §19): empty/missing test scores
    // are stored as NULL, not fake defaults (7.0/95/1350/315/3.5).
    const numOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    // Test scores must be positive — a 0 (or negative) is not a real score.
    const scoreOrNull = (v: unknown): number | null => {
      const n = numOrNull(v);
      return n !== null && n > 0 ? n : null;
    };
    const [newProfile] = await db.insert(studentProfiles).values({
      name: body.name || "New Student Profile",
      email: body.email || "student@scholarbridge.edu",
      degreeLevel: body.degreeLevel || "Master",
      targetMajor: body.targetMajor || "Computer Science",
      gpa: numOrNull(body.gpa) ?? 3.5, // schema default; real GPA entered later
      gpaScale: numOrNull(body.gpaScale) ?? 4.0,
      ieltsScore: scoreOrNull(body.ieltsScore),
      toeflScore: scoreOrNull(body.toeflScore),
      satScore: scoreOrNull(body.satScore),
      greScore: scoreOrNull(body.greScore),
      budgetAnnualUsd: numOrNull(body.budgetAnnualUsd) ?? 25000,
      preferredCountries: countriesStr,
      needScholarship: body.needScholarship ?? true,
      extracurriculars: body.extracurriculars || "",
      workExperienceYears: numOrNull(body.workExperienceYears) ?? 0,
      researchPublications: numOrNull(body.researchPublications) ?? 0,
      preferredLocale: body.preferredLocale || "en",
    }).returning();

    // Welcome points for the new student (idempotent per profile).
    try {
      await awardPoints(newProfile.id, 20, "profile_created", newProfile.id);
    } catch (err) {
      console.error("Failed to award welcome points:", err);
    }

    // Referral system: generate the new profile's own unique code, and if a
    // ?ref= code was stored (from the signup link) apply it to referred_by.
    try {
      await ensureReferralCode(newProfile.id);
      if (body.referralCode) {
        const applied = await applyReferralCodeToProfile(newProfile.id, body.referralCode);
        if (applied.error === "SELF") {
          console.warn("Self-referral blocked for profile", newProfile.id);
        }
      }
    } catch (err) {
      console.error("Failed to set up referral for new profile:", err);
    }

    return NextResponse.json({ profile: newProfile });
  } catch (error) {
    console.error("POST /api/profiles error:", error);
    if (isMissingColumnsError(error)) {
      return NextResponse.json(
        {
          error:
            "Database schema is out of date. The application is configured to NEVER modify the database automatically. Please review the app schema vs your Supabase schema and align them manually.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to create student profile" }, { status: 500 });
  }
}
