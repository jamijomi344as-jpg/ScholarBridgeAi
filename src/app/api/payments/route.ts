import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const profileId = parseInt(profileIdStr, 10);

    const history = await db
      .select()
      .from(payments)
      .where(eq(payments.profileId, profileId))
      .orderBy(desc(payments.createdAt));

    const subscription = await findActiveSubscription(profileId);

    return NextResponse.json({
      payments: history,
      subscription,
      isPremium: subscriptionIsActive(subscription),
    });
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  }
}
