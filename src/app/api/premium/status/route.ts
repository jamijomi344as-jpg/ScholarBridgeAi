import { NextResponse } from "next/server";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

    if (!profileId) {
      return NextResponse.json({ isPremium: false });
    }

    const sub = await findActiveSubscription(profileId);
    return NextResponse.json({ isPremium: subscriptionIsActive(sub) });
  } catch (error) {
    console.error("GET /api/premium/status error:", error);
    return NextResponse.json({ error: "Failed to check premium status" }, { status: 500 });
  }
}
