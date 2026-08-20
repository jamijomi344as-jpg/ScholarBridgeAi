import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles, payments, subscriptions } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { eq, and, ilike } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    // Locate the recipient profile by explicit profileId (exact, most
    // reliable) or by email — case-insensitively, because PostgreSQL text
    // equality is case-sensitive and stored emails may have mixed case.
    let profile = null;
    if (body.profileId) {
      const [row] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, Number(body.profileId)));
      profile = row ?? null;
    }
    if (!profile && body.email) {
      // Escape wildcards so an email containing % or _ is matched literally.
      const email = String(body.email)
        .toLowerCase()
        .trim()
        .replace(/[%_]/g, (c) => `\\${c}`);
      const rows = await db
        .select()
        .from(studentProfiles)
        .where(ilike(studentProfiles.email, email));
      profile = rows[0] ?? null;
    }
    if (!profile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const days = Math.max(1, Number(body.days) || 30);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + days * 86400000);

    // Ledger row for the gift (zero amount, marked paid).
    const [payment] = await db
      .insert(payments)
      .values({
        profileId: profile.id,
        provider: "gift",
        providerTransactionId: "",
        amount: 0,
        currency: "UZS",
        status: "paid",
        purpose: "premium_gift",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Activate the gifted premium subscription.
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        profileId: profile.id,
        plan: "premium",
        status: "active",
        currentPeriodEnd: periodEnd,
        paymentId: payment.id,
      })
      .returning();

    return NextResponse.json({ subscription, profile });
  } catch (error) {
    console.error("POST /api/admin/premium error:", error);
    return NextResponse.json({ error: "Failed to grant premium" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");
    if (!(await isAdmin(adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "Profile id is required" }, { status: 400 });
    }

    // Revoke all active subscriptions for that user.
    await db
      .update(subscriptions)
      .set({ status: "canceled" })
      .where(
        and(
          eq(subscriptions.profileId, profileId),
          eq(subscriptions.status, "active")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/premium error:", error);
    return NextResponse.json({ error: "Failed to revoke premium" }, { status: 500 });
  }
}
