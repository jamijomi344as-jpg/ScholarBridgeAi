import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import { awardPoints } from "@/lib/gamification";
import { ensureReferralCode, applyReferralCodeToProfile } from "@/lib/referrals";

export async function GET() {
  try {
    await seedDatabase();
    const profiles = await db.select().from(studentProfiles);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("GET /api/profiles error:", error);
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

    const [newProfile] = await db.insert(studentProfiles).values({
      name: body.name || "New Student Profile",
      email: body.email || "student@scholarbridge.edu",
      degreeLevel: body.degreeLevel || "Master",
      targetMajor: body.targetMajor || "Computer Science",
      gpa: Number(body.gpa) || 3.5,
      gpaScale: Number(body.gpaScale) || 4.0,
      ieltsScore: body.ieltsScore ? Number(body.ieltsScore) : 7.0,
      toeflScore: body.toeflScore ? Number(body.toeflScore) : 95,
      satScore: body.satScore ? Number(body.satScore) : 1350,
      greScore: body.greScore ? Number(body.greScore) : 315,
      budgetAnnualUsd: Number(body.budgetAnnualUsd) || 25000,
      preferredCountries: countriesStr,
      needScholarship: body.needScholarship ?? true,
      extracurriculars: body.extracurriculars || "",
      workExperienceYears: Number(body.workExperienceYears) || 0,
      researchPublications: Number(body.researchPublications) || 0,
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
    return NextResponse.json({ error: "Failed to create student profile" }, { status: 500 });
  }
}
