import { NextResponse } from "next/server";
import { db } from "@/db";
import { scholarships } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { eq } from "drizzle-orm";
import { auditRowChanges, writeAudit } from "@/lib/audit";

function toBool(value: any): boolean {
  return value === true || value === "true";
}

function toJsonField(value: any, fallback: string): string {
  if (value == null || value === "") return fallback;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function buildScholarshipValues(s: any) {
  return {
    title: s.title || "Untitled Scholarship",
    provider: s.provider || "Unknown",
    country: s.country || "Global",
    coverageType: s.coverageType || "Full Tuition + Stipend",
    amountUsdValue: Number(s.amountUsdValue) || 0,
    deadline: s.deadline || "",
    degreeLevels: toJsonField(s.degreeLevels, '["Master","PhD"]'),
    eligibleMajors: toJsonField(s.eligibleMajors, '["All"]'),
    minGpa: s.minGpa === "" || s.minGpa == null ? null : Number(s.minGpa),
    minIelts: s.minIelts === "" || s.minIelts == null ? null : Number(s.minIelts),
    financialNeedBased: toBool(s.financialNeedBased),
    meritBased: s.meritBased == null ? true : toBool(s.meritBased),
    description: s.description || "",
    requirements: s.requirements || "",
    websiteUrl: s.websiteUrl || "",
    // --- Dynamic lifecycle (spec §4) ---
    eligibleCountries: toJsonField(s.eligibleCountries, "[]"),
    fundingType: s.fundingType || "",
    tuitionCoverage: s.tuitionCoverage || "",
    livingAllowance: s.livingAllowance === "" || s.livingAllowance == null ? null : Number(s.livingAllowance),
    travelAllowance: s.travelAllowance === "" || s.travelAllowance == null ? null : Number(s.travelAllowance),
    accommodation: s.accommodation || "",
    applicationFee: s.applicationFee === "" || s.applicationFee == null ? null : Number(s.applicationFee),
    englishRequirements: s.englishRequirements || "",
    requiredDocuments: toJsonField(s.requiredDocuments, "[]"),
    applicationUrl: s.applicationUrl || null,
    openingDate: s.openingDate || null,
    deadlineDate: s.deadlineDate || null,
    deadlineType: s.deadlineType || "unknown",
    deadlineRangeStart: s.deadlineRangeStart || null,
    deadlineRangeEnd: s.deadlineRangeEnd || null,
    rounds: toJsonField(s.rounds, "[]"),
    recurrence: s.recurrence || "none",
    expectedOpeningPeriod: s.expectedOpeningPeriod || null,
    expectedDeadlinePeriod: s.expectedDeadlinePeriod || null,
    sourceUrl: s.sourceUrl || null,
    verificationStatus: s.verificationStatus || "unverified",
    sourceReliability: Number(s.sourceReliability) || 7,
    isActive: s.isActive == null ? true : toBool(s.isActive),
    notes: s.notes || null,
    lastUpdatedAt: new Date(),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }
    const [scholarship] = await db
      .insert(scholarships)
      .values(buildScholarshipValues(body.scholarship || {}))
      .returning();
    await writeAudit({
      entityType: "scholarship",
      entityId: scholarship.id,
      fieldChanged: "created",
      newValue: scholarship.title,
      actor: "ADMIN",
      verificationStatus: "unverified",
    });
    return NextResponse.json({ scholarship });
  } catch (error) {
    console.error("POST /api/admin/scholarships error:", error);
    return NextResponse.json({ error: "Failed to create scholarship" }, { status: 500 });
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
      return NextResponse.json({ error: "Scholarship id is required" }, { status: 400 });
    }
    const [existing] = await db.select().from(scholarships).where(eq(scholarships.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
    }
    const values = buildScholarshipValues(body.scholarship || {});
    const [scholarship] = await db
      .update(scholarships)
      .set(values)
      .where(eq(scholarships.id, id))
      .returning();
    await auditRowChanges("scholarship", id, existing, { ...existing, ...values }, { actor: "ADMIN" });
    return NextResponse.json({ scholarship });
  } catch (error) {
    console.error("PATCH /api/admin/scholarships error:", error);
    return NextResponse.json({ error: "Failed to update scholarship" }, { status: 500 });
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
      return NextResponse.json({ error: "Scholarship id is required" }, { status: 400 });
    }
    await db.delete(scholarships).where(eq(scholarships.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/scholarships error:", error);
    return NextResponse.json({ error: "Failed to delete scholarship" }, { status: 500 });
  }
}
