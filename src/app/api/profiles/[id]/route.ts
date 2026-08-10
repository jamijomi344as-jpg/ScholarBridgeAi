import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { completeReferralIfDue } from "@/lib/referrals";

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

    let countriesStr = body.preferredCountries;
    if (Array.isArray(body.preferredCountries)) {
      countriesStr = JSON.stringify(body.preferredCountries);
    }

    const [updatedProfile] = await db.update(studentProfiles)
      .set({
        name: body.name,
        email: body.email,
        degreeLevel: body.degreeLevel,
        targetMajor: body.targetMajor,
        gpa: body.gpa !== undefined ? Number(body.gpa) : undefined,
        gpaScale: body.gpaScale !== undefined ? Number(body.gpaScale) : undefined,
        ieltsScore: body.ieltsScore !== undefined ? (body.ieltsScore === null ? null : Number(body.ieltsScore)) : undefined,
        toeflScore: body.toeflScore !== undefined ? (body.toeflScore === null ? null : Number(body.toeflScore)) : undefined,
        satScore: body.satScore !== undefined ? (body.satScore === null ? null : Number(body.satScore)) : undefined,
        greScore: body.greScore !== undefined ? (body.greScore === null ? null : Number(body.greScore)) : undefined,
        budgetAnnualUsd: body.budgetAnnualUsd !== undefined ? Number(body.budgetAnnualUsd) : undefined,
        preferredCountries: countriesStr,
        needScholarship: body.needScholarship,
        extracurriculars: body.extracurriculars,
        workExperienceYears: body.workExperienceYears !== undefined ? Number(body.workExperienceYears) : undefined,
        researchPublications: body.researchPublications !== undefined ? Number(body.researchPublications) : undefined,
        preferredLocale: body.preferredLocale !== undefined ? body.preferredLocale : undefined,
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
    await db.delete(studentProfiles).where(eq(studentProfiles.id, profileId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/profiles/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
