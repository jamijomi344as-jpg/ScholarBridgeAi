import { NextResponse } from "next/server";
import { getReferralStatus, activateReferralReward } from "@/lib/referrals";

/**
 * Referral system v2 — per-profile columns on student_profiles.
 * NOTE: there is no auth yet, so the "current user" is the active profile
 * (profileId), matching how the rest of this app works. Once real auth is
 * added, profileId must come from the session, never from the client.
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const profileId = parseInt(profileIdStr, 10);
    if (!profileId) {
      return NextResponse.json({ error: "Invalid profileId" }, { status: 400 });
    }
    const status = await getReferralStatus(profileId);
    if (!status) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/referral error:", error);
    return NextResponse.json({ error: "Failed to fetch referral info" }, { status: 500 });
  }
}

/**
 * Called by the server-side flow once a referred user becomes active
 * (onboarding completed). Awards the referrer +1 point and, at every 5th
 * point, grants/stacks 30 days of premium — atomically, server-side only.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = Number(body.profileId);
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const result = await activateReferralReward(profileId);
    if (!result.ok) {
      // Not an error state — just nothing to award (no referrer / already rewarded).
      return NextResponse.json(result);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/referral/activate error:", error);
    return NextResponse.json({ error: "Failed to activate referral" }, { status: 500 });
  }
}
