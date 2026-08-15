import { NextResponse } from "next/server";
import { db } from "@/db";
import { scholarships, universities } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { eq, desc } from "drizzle-orm";
import { writeAudit } from "@/lib/audit";

/**
 * Verification workflow (spec §10): admins review auto-discovered / unverified
 * records and mark them verified with a source. Unverified data is never
 * presented as verified to users.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (!(await isAdmin(searchParams.get("adminProfileId")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const status = searchParams.get("status") || "unverified";

    const sch = await db
      .select()
      .from(scholarships)
      .where(eq(scholarships.verificationStatus, status))
      .orderBy(desc(scholarships.id))
      .limit(50);
    const uni = await db
      .select()
      .from(universities)
      .where(eq(universities.verificationStatus, status))
      .orderBy(desc(universities.id))
      .limit(50);

    return NextResponse.json({ scholarships: sch, universities: uni });
  } catch (error) {
    console.error("GET /api/admin/verify error:", error);
    return NextResponse.json({ error: "Failed to load records" }, { status: 500 });
  }
}

/** PATCH: mark a record as verified (with optional source note). */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { entityType, id, sourceUrl } = body;
    if (!["scholarship", "university"].includes(entityType) || !id) {
      return NextResponse.json({ error: "entityType and id are required" }, { status: 400 });
    }

    const now = new Date();
    if (entityType === "scholarship") {
      const [row] = await db
        .update(scholarships)
        .set({
          verificationStatus: "verified",
          lastVerifiedAt: now,
          lastUpdatedAt: now,
          sourceUrl: sourceUrl ?? undefined,
        })
        .where(eq(scholarships.id, Number(id)))
        .returning();
      await writeAudit({
        entityType: "scholarship",
        entityId: row.id,
        fieldChanged: "verificationStatus",
        oldValue: row.verificationStatus,
        newValue: "verified",
        source: sourceUrl || null,
        actor: "ADMIN",
        verificationStatus: "verified",
      });
      return NextResponse.json({ success: true, record: row });
    } else {
      const [row] = await db
        .update(universities)
        .set({
          verificationStatus: "verified",
          lastVerifiedAt: now,
          sourceUrl: sourceUrl ?? undefined,
        })
        .where(eq(universities.id, Number(id)))
        .returning();
      await writeAudit({
        entityType: "university",
        entityId: row.id,
        fieldChanged: "verificationStatus",
        oldValue: row.verificationStatus,
        newValue: "verified",
        source: sourceUrl || null,
        actor: "ADMIN",
        verificationStatus: "verified",
      });
      return NextResponse.json({ success: true, record: row });
    }
  } catch (error) {
    console.error("PATCH /api/admin/verify error:", error);
    return NextResponse.json({ error: "Failed to verify record" }, { status: 500 });
  }
}
