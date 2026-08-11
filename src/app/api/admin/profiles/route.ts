import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";
import { desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");
    if (!(await isAdmin(adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const profiles = await db
      .select()
      .from(studentProfiles)
      .orderBy(desc(studentProfiles.id));

    const enriched = [];
    for (const profile of profiles) {
      const sub = await findActiveSubscription(profile.id);
      const active = subscriptionIsActive(sub);
      enriched.push({
        ...profile,
        isPremium: active,
        premiumUntil: active && sub ? sub.currentPeriodEnd : null,
      });
    }

    return NextResponse.json({ profiles: enriched });
  } catch (error) {
    console.error("GET /api/admin/profiles error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}
