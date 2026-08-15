import { NextResponse } from "next/server";
import { db } from "@/db";
import { universities, scholarships, savedUniversities, savedScholarships, applicationTasks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { computeScholarshipStatus, statusLabel } from "@/lib/scholarshipStatus";

/**
 * Unified deadline center (spec §21). Merges:
 *  - university application deadlines (saved universities)
 *  - scholarship deadlines (with computed status)
 *  - user-created milestones (applicationTasks)
 * Each item has date, type, source, status, days remaining.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const items: any[] = [];
    const now = new Date();

    // --- Scholarships (all active, with computed status) ---
    const savedSchRows = await db
      .select()
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, profileId));
    const savedSchIds = savedSchRows.map((s) => s.scholarshipId);

    const allScholarships = await db.select().from(scholarships).where(eq(scholarships.isActive, true));
    for (const s of allScholarships) {
      const status = computeScholarshipStatus(s);
      let date: Date | null = null;
      if (s.deadlineDate) date = new Date(s.deadlineDate);
      else if (s.deadlineRangeEnd) date = new Date(s.deadlineRangeEnd);
      else if (s.deadlineRangeStart) date = new Date(s.deadlineRangeStart);

      if (date && date.getTime() > now.getTime() - 365 * 86400000) {
        items.push({
          id: `sch-${s.id}`,
          type: "scholarship",
          title: s.title,
          subtitle: s.provider,
          date: date.toISOString(),
          status: statusLabel(status),
          daysRemaining: Math.ceil((date.getTime() - now.getTime()) / 86400000),
          source: s.sourceUrl || s.websiteUrl || null,
          saved: savedSchIds.includes(s.id),
        });
      }
    }

    // --- Saved universities (deadline not stored in universities table —
    //     use created/updated as placeholder only if a deadline exists) ---
    const savedUnis = await db
      .select()
      .from(savedUniversities)
      .where(eq(savedUniversities.profileId, profileId));
    if (savedUnis.length > 0) {
      const uniRows = await db
        .select()
        .from(universities)
        .where(inArray(universities.id, savedUnis.map((u) => u.universityId)));
      for (const u of uniRows) {
        items.push({
          id: `uni-${u.id}`,
          type: "university",
          title: u.name,
          subtitle: `${u.country} · ${u.programMajor}`,
          date: null,
          status: "OPEN",
          daysRemaining: null,
          source: u.websiteUrl || null,
          saved: true,
        });
      }
    }

    // --- User milestones ---
    const tasks = await db
      .select()
      .from(applicationTasks)
      .where(eq(applicationTasks.profileId, profileId));
    for (const t of tasks) {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      items.push({
        id: `task-${t.id}`,
        type: "milestone",
        title: t.title,
        subtitle: t.category,
        date: due ? due.toISOString() : null,
        status: t.isCompleted ? "COMPLETED" : "PENDING",
        daysRemaining: due ? Math.ceil((due.getTime() - now.getTime()) / 86400000) : null,
        source: null,
        saved: false,
      });
    }

    // Sort: items with dates first, nearest first; items without dates last.
    items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/deadlines error:", error);
    return NextResponse.json({ error: "Failed to load deadlines" }, { status: 500 });
  }
}
