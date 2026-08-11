import { NextResponse } from "next/server";
import { db } from "@/db";
import { scholarships } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { eq } from "drizzle-orm";

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
    const [scholarship] = await db
      .update(scholarships)
      .set(buildScholarshipValues(body.scholarship || {}))
      .where(eq(scholarships.id, id))
      .returning();
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
