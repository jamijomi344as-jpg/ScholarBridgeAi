import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReports, studentProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "open";

    const rows = await db
      .select({
        id: forumReports.id,
        reporterId: forumReports.reporterId,
        targetType: forumReports.targetType,
        targetId: forumReports.targetId,
        reason: forumReports.reason,
        status: forumReports.status,
        createdAt: forumReports.createdAt,
        resolvedAt: forumReports.resolvedAt,
        reporterName: studentProfiles.name,
      })
      .from(forumReports)
      .leftJoin(studentProfiles, eq(forumReports.reporterId, studentProfiles.id))
      .where(eq(forumReports.status, status))
      .orderBy(desc(forumReports.createdAt));

    return NextResponse.json({ reports: rows });
  } catch (error) {
    console.error("GET /api/forum/reports error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reporterId, targetType, targetId, reason } = body;

    if (!reporterId || !targetType || !targetId || !reason) {
      return NextResponse.json({ error: "reporterId, targetType, targetId and reason are required" }, { status: 400 });
    }

    const [report] = await db
      .insert(forumReports)
      .values({
        reporterId: Number(reporterId),
        targetType,
        targetId: Number(targetId),
        reason,
        status: "open",
      })
      .returning();

    return NextResponse.json({ report });
  } catch (error) {
    console.error("POST /api/forum/reports error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
