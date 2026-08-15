import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  applicationDocuments,
  savedScholarships,
  savedUniversities,
  scholarships,
  universities,
} from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";

/**
 * Document checklist (spec §24).
 * Documents are NOT hardcoded — they come from each scholarship's
 * `required_documents` field. For universities (no document data yet) and
 * general needs, users can add custom documents.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    // Ensure checklist rows exist for saved scholarships' required documents.
    const savedSch = await db
      .select()
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, profileId));
    if (savedSch.length > 0) {
      const schRows = await db
        .select()
        .from(scholarships)
        .where(inArray(scholarships.id, savedSch.map((s) => s.scholarshipId)));
      for (const sch of schRows) {
        let required: string[] = [];
        try {
          required = JSON.parse(sch.requiredDocuments || "[]");
        } catch {
          required = [];
        }
        for (const docType of required) {
          const [existing] = await db
            .select()
            .from(applicationDocuments)
            .where(
              and(
                eq(applicationDocuments.profileId, profileId),
                eq(applicationDocuments.entityType, "scholarship"),
                eq(applicationDocuments.entityId, sch.id),
                eq(applicationDocuments.documentType, docType)
              )
            );
          if (!existing) {
            await db.insert(applicationDocuments).values({
              profileId,
              entityType: "scholarship",
              entityId: sch.id,
              documentType: docType,
              label: docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              isRequired: true,
              status: "missing",
              deadlineDate: sch.deadlineDate,
            });
          }
        }
      }
    }

    const rows = await db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.profileId, profileId));

    // Attach entity names for display.
    const schIds = rows.filter((r) => r.entityType === "scholarship" && r.entityId).map((r) => r.entityId as number);
    const uniIds = rows.filter((r) => r.entityType === "university" && r.entityId).map((r) => r.entityId as number);
    const schMap = new Map<number, string>();
    const uniMap = new Map<number, string>();
    if (schIds.length) {
      const schs = await db.select().from(scholarships).where(inArray(scholarships.id, schIds));
      schs.forEach((s) => schMap.set(s.id, s.title));
    }
    if (uniIds.length) {
      const unis = await db.select().from(universities).where(inArray(universities.id, uniIds));
      unis.forEach((u) => uniMap.set(u.id, u.name));
    }

    const docs = rows.map((r) => ({
      ...r,
      entityName: r.entityType === "scholarship" ? schMap.get(r.entityId as number) : r.entityType === "university" ? uniMap.get(r.entityId as number) : null,
    }));

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

/** POST: add a custom document. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = Number(body.profileId);
    if (!profileId || !body.label) {
      return NextResponse.json({ error: "profileId and label are required" }, { status: 400 });
    }
    const [doc] = await db
      .insert(applicationDocuments)
      .values({
        profileId,
        entityType: body.entityType || "general",
        entityId: body.entityId ? Number(body.entityId) : null,
        documentType: body.documentType || "custom",
        label: String(body.label),
        isRequired: false,
        status: "missing",
        deadlineDate: body.deadlineDate || null,
      })
      .returning();
    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json({ error: "Failed to add document" }, { status: 500 });
  }
}

/** PATCH: update document status (uploaded/missing/not_required) or fileUrl. */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "document id is required" }, { status: 400 });
    }
    const [doc] = await db
      .update(applicationDocuments)
      .set({
        status: body.status ?? undefined,
        fileUrl: body.fileUrl ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(applicationDocuments.id, id))
      .returning();
    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("PATCH /api/documents error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

/** DELETE: remove a custom document. */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "document id is required" }, { status: 400 });
    }
    await db.delete(applicationDocuments).where(eq(applicationDocuments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
