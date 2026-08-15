import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";
import { referralPremiumActive } from "@/lib/referrals";
import { profilePlan } from "@/lib/entitlements";

/**
 * Premium status is "active" when EITHER:
 *  - a paid subscription is active (Payme/Click, subscriptions table), or
 *  - premium was granted through the referral system
 *    (student_profiles.is_premium + premium_until, stackable 30-day grants).
 *
 * Also returns the computed plan (free/premium/admin) for the centralized
 * entitlement system (spec §17).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

    if (!profileId) {
      return NextResponse.json({ isPremium: false, plan: "free" });
    }

    const sub = await findActiveSubscription(profileId);
    const subscriptionActive = subscriptionIsActive(sub);

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));

    const referralActive = profile ? referralPremiumActive(profile) : false;
    const isPremium = subscriptionActive || referralActive;

    return NextResponse.json({
      isPremium,
      source: subscriptionActive ? "subscription" : referralActive ? "referral" : "none",
      premiumUntil: referralActive ? profile?.premiumUntil : subscriptionActive ? sub?.currentPeriodEnd : null,
      plan: profile ? profilePlan({ isAdmin: profile.isAdmin, isPremium, premiumUntil: profile.premiumUntil }) : "free",
    });
  } catch (error) {
    console.error("GET /api/premium/status error:", error);
    return NextResponse.json({ error: "Failed to check premium status" }, { status: 500 });
  }
}
