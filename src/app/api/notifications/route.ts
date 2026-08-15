import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, notificationPreferences } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/** GET: list notifications for a profile (spec §20 — in-app channel). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Number(searchParams.get("limit") || 50);

    const rows = unreadOnly
      ? await db
          .select()
          .from(notifications)
          .where(and(eq(notifications.profileId, profileId), eq(notifications.isRead, false)))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
      : await db
          .select()
          .from(notifications)
          .where(eq(notifications.profileId, profileId))
          .orderBy(desc(notifications.createdAt))
          .limit(limit);

    return NextResponse.json({ notifications: rows });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

/** PATCH: mark notification(s) as read. */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { notificationId, profileId, all } = body;
    if (all && profileId) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.profileId, Number(profileId)), eq(notifications.isRead, false)));
      return NextResponse.json({ success: true });
    }
    if (notificationId) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, Number(notificationId)));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "notificationId or profileId+all required" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

/** PUT: update notification preferences. */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const profileId = Number(body.profileId);
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.profileId, profileId));
    if (existing) {
      await db
        .update(notificationPreferences)
        .set({
          inApp: body.inApp ?? existing.inApp,
          email: body.email ?? existing.email,
          push: body.push ?? existing.push,
          types: body.types ? JSON.stringify(body.types) : existing.types,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.profileId, profileId));
    } else {
      await db.insert(notificationPreferences).values({
        profileId,
        inApp: body.inApp ?? true,
        email: body.email ?? false,
        push: body.push ?? false,
        types: body.types ? JSON.stringify(body.types) : undefined,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
