import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReports } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reportId = parseInt(id, 10);
    const body = await req.json();
    const { status } = body; // 'resolved' | 'dismissed'

    if (!["resolved", "dismissed"].includes(status)) {
      return NextResponse.json({ error: "status must be 'resolved' or 'dismissed'" }, { status: 400 });
    }

    const [updated] = await db
      .update(forumReports)
      .set({
        status,
        resolvedAt: new Date(),
      })
      .where(eq(forumReports.id, reportId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("PATCH /api/forum/reports/[id] error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
