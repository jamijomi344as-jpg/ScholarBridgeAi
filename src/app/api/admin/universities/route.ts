import { NextResponse } from "next/server";
import { db } from "@/db";
import { universities } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { eq } from "drizzle-orm";
import { auditRowChanges, writeAudit } from "@/lib/audit";

function buildUniversityValues(u: any) {
  return {
    name: u.name || "Untitled University",
    country: u.country || "Unknown",
    city: u.city || "",
    flagEmoji: u.flagEmoji || "🌐",
    worldRanking: Number(u.worldRanking) || 0,
    degreeLevel: u.degreeLevel || "All",
    programMajor: u.programMajor || "",
    annualTuitionUsd: Number(u.annualTuitionUsd) || 0,
    annualLivingEstUsd: Number(u.annualLivingEstUsd) || 0,
    minGpa: u.minGpa === "" || u.minGpa == null ? 3.0 : Number(u.minGpa),
    minIelts: u.minIelts === "" || u.minIelts == null ? 6.5 : Number(u.minIelts),
    minSat: u.minSat === "" || u.minSat == null ? null : Number(u.minSat),
    acceptanceRate: Number(u.acceptanceRate) || 0,
    postStudyWorkVisaYears:
      u.postStudyWorkVisaYears === "" || u.postStudyWorkVisaYears == null
        ? 2.0
        : Number(u.postStudyWorkVisaYears),
    description: u.description || "",
    highlights: u.highlights || "[]",
    websiteUrl: u.websiteUrl || "",
    imageUrl: u.imageUrl || "",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }
    const [university] = await db
      .insert(universities)
      .values(buildUniversityValues(body.university || {}))
      .returning();
    await writeAudit({
      entityType: "university",
      entityId: university.id,
      fieldChanged: "created",
      newValue: university.name,
      actor: "ADMIN",
      verificationStatus: "unverified",
    });
    return NextResponse.json({ university });
  } catch (error) {
    console.error("POST /api/admin/universities error:", error);
    return NextResponse.json({ error: "Failed to create university" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "University id is required" }, { status: 400 });
    }
    const [existing] = await db.select().from(universities).where(eq(universities.id, id));
    if (!existing) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }
    const values = buildUniversityValues(body.university || {});
    const [university] = await db
      .update(universities)
      .set(values)
      .where(eq(universities.id, id))
      .returning();
    await auditRowChanges("university", id, existing, { ...existing, ...values }, { actor: "ADMIN" });
    return NextResponse.json({ university });
  } catch (error) {
    console.error("PATCH /api/admin/universities error:", error);
    return NextResponse.json({ error: "Failed to update university" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");
    if (!(await isAdmin(adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "University id is required" }, { status: 400 });
    }
    await db.delete(universities).where(eq(universities.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/universities error:", error);
    return NextResponse.json({ error: "Failed to delete university" }, { status: 500 });
  }
}
