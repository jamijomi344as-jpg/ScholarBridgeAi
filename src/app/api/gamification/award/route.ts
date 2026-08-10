import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { awardPoints, computeProfileCompleteness } from "@/lib/gamification";
import { completeReferralIfDue } from "@/lib/referrals";

/** Award points (e.g. course completion, profile completion, helpful replies). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, points, reason, relatedEntityId } = body;

    if (!profileId || !points) {
      return NextResponse.json({ error: "profileId and points are required" }, { status: 400 });
    }

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, Number(profileId)));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Auto-award profile completion bonus once when the profile is complete.
    let award = await awardPoints(profile.id, Number(points), reason || "action", relatedEntityId ?? null);

    // Referral completion: when a referred user's profile is now complete,
    // mark the referral done and award both parties.
    let referral = null;
    try {
      referral = await completeReferralIfDue(profile.id);
    } catch (err) {
      console.error("Failed to complete referral:", err);
    }

    return NextResponse.json({ award, referral });
  } catch (error) {
    console.error("POST /api/gamification/award error:", error);
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
