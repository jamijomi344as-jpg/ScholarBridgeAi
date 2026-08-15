import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultingRequests, studentProfiles } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { eq, desc, inArray } from "drizzle-orm";

/** GET: all consulting requests (admin). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (!(await isAdmin(searchParams.get("adminProfileId")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await db
      .select()
      .from(consultingRequests)
      .orderBy(desc(consultingRequests.createdAt))
      .limit(100);

    // Attach student names.
    const profileIds = [...new Set(rows.map((r) => r.profileId))];
    const nameMap = new Map<number, string>();
    if (profileIds.length) {
      const profiles = await db
        .select({ id: studentProfiles.id, name: studentProfiles.name })
        .from(studentProfiles)
        .where(inArray(studentProfiles.id, profileIds));
      profiles.forEach((p) => nameMap.set(p.id, p.name));
    }

    return NextResponse.json({
      requests: rows.map((r) => ({ ...r, studentName: nameMap.get(r.profileId) || null })),
    });
  } catch (error) {
    console.error("GET /api/admin/consulting error:", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

/** PATCH: update request status / admin notes. */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const [row] = await db
      .update(consultingRequests)
      .set({
        status: body.status ?? undefined,
        adminNotes: body.adminNotes ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(consultingRequests.id, id))
      .returning();
    return NextResponse.json({ request: row });
  } catch (error) {
    console.error("PATCH /api/admin/consulting error:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
