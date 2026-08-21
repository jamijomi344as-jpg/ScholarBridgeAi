import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { completeReferralIfDue, activateReferralReward } from "@/lib/referrals";
import { isAdmin } from "@/lib/admin";

/**
 * Authorization: the profile owner may read/update their own profile; an
 * admin (is_admin) may read/update/delete any profile. A bare profileId in
 * the body is never enough — the requester must prove who they are via
 * requesterId (and admins additionally via is_admin).
 */
async function canModify(requesterId: unknown, targetProfileId: number): Promise<"own" | "admin" | false> {
  const id = Number(requesterId);
  if (!Number.isFinite(id) || id <= 0) return false;
  if (id === targetProfileId) return "own";
  return (await isAdmin(id)) ? "admin" : false;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/profiles/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);
    const body = await req.json();

    // Authorization: own profile or admin.
    const access = await canModify(body.requesterId ?? body.userId, profileId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden: you can only edit your own profile" }, { status: 403 });
    }

    let countriesStr = body.preferredCountries;
    if (Array.isArray(body.preferredCountries)) {
      countriesStr = JSON.stringify(body.preferredCountries);
    }

    const [updatedProfile] = await db.update(studentProfiles)
      .set({
        name: body.name ?? undefined,
        email: body.email ?? undefined,
        degreeLevel: body.degreeLevel !== undefined ? body.degreeLevel : undefined,
        targetMajor: body.targetMajor !== undefined ? body.targetMajor : undefined,
        gpa: body.gpa !== undefined ? Number(body.gpa) : undefined,
        gpaScale: body.gpaScale !== undefined ? Number(body.gpaScale) : undefined,
        // Test scores: null/0/negative -> NULL (a 0 is not a real score).
        ieltsScore: body.ieltsScore !== undefined ? (body.ieltsScore === null || Number(body.ieltsScore) <= 0 ? null : Number(body.ieltsScore)) : undefined,
        toeflScore: body.toeflScore !== undefined ? (body.toeflScore === null || Number(body.toeflScore) <= 0 ? null : Number(body.toeflScore)) : undefined,
        satScore: body.satScore !== undefined ? (body.satScore === null || Number(body.satScore) <= 0 ? null : Number(body.satScore)) : undefined,
        greScore: body.greScore !== undefined ? (body.greScore === null || Number(body.greScore) <= 0 ? null : Number(body.greScore)) : undefined,
        budgetAnnualUsd: body.budgetAnnualUsd !== undefined ? Number(body.budgetAnnualUsd) : undefined,
        preferredCountries: countriesStr,
        needScholarship: body.needScholarship !== undefined ? body.needScholarship : undefined,
        extracurriculars: body.extracurriculars !== undefined ? body.extracurriculars : undefined,
        workExperienceYears: body.workExperienceYears !== undefined ? Number(body.workExperienceYears) : undefined,
        researchPublications: body.researchPublications !== undefined ? Number(body.researchPublications) : undefined,
        preferredLocale: body.preferredLocale !== undefined ? body.preferredLocale : undefined,
        // Onboarding wizard persistence (resume support)
        onboardingStep: body.onboardingStep !== undefined ? Number(body.onboardingStep) : undefined,
        onboardingCompleted: body.onboardingCompleted !== undefined ? !!body.onboardingCompleted : undefined,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profileId))
      .returning();

    // When the profile reaches completion, complete any pending referral.
    if (updatedProfile) {
      try {
        await completeReferralIfDue(profileId);
      } catch (err) {
        console.error("Failed to complete referral:", err);
      }
      // Referral v2: when onboarding is completed, activate the referrer's
      // reward server-side (idempotent — guarded by referral_rewarded).
      if (updatedProfile.onboardingCompleted) {
        try {
          const reward = await activateReferralReward(profileId);
          if (reward.ok) {
            console.log(
              `Referral activated: profile ${profileId} → referrer +1 point (${reward.points} total${reward.premiumGranted ? ", premium granted" : ""})`
            );
          }
        } catch (err) {
          console.error("Failed to activate referral reward:", err);
        }
      }
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("PUT /api/profiles/[id] error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);
    const { searchParams } = new URL(req.url);

    // Only an admin may delete a profile (deleting is destructive).
    if (!(await isAdmin(searchParams.get("requesterId")))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    await db.delete(studentProfiles).where(eq(studentProfiles.id, profileId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/profiles/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
