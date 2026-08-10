import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedScholarships, scholarships } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");

    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profileId = parseInt(profileIdStr, 10);
    const saved = await db
      .select({
        id: savedScholarships.id,
        profileId: savedScholarships.profileId,
        scholarshipId: savedScholarships.scholarshipId,
        status: savedScholarships.status,
        notes: savedScholarships.notes,
        createdAt: savedScholarships.createdAt,
        scholarship: scholarships,
      })
      .from(savedScholarships)
      .innerJoin(scholarships, eq(savedScholarships.scholarshipId, scholarships.id))
      .where(eq(savedScholarships.profileId, profileId));

    return NextResponse.json({ savedScholarships: saved });
  } catch (error) {
    console.error("GET /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to fetch saved scholarships" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, scholarshipId, status, notes } = body;

    if (!profileId || !scholarshipId) {
      return NextResponse.json({ error: "profileId and scholarshipId are required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(savedScholarships)
      .where(
        and(
          eq(savedScholarships.profileId, profileId),
          eq(savedScholarships.scholarshipId, scholarshipId)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ saved: existing[0], message: "Already saved" });
    }

    const [newSaved] = await db.insert(savedScholarships).values({
      profileId,
      scholarshipId,
      status: status || "Saved",
      notes: notes || "",
    }).returning();

    return NextResponse.json({ saved: newSaved });
  } catch (error) {
    console.error("POST /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to save scholarship" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(savedScholarships)
      .set({
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
      })
      .where(eq(savedScholarships.id, id))
      .returning();

    return NextResponse.json({ saved: updated });
  } catch (error) {
    console.error("PATCH /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to update saved scholarship" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    await db.delete(savedScholarships).where(eq(savedScholarships.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to delete saved scholarship" }, { status: 500 });
  }
}
