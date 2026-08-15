import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  applicationTasks,
  savedScholarships,
  savedUniversities,
  scholarships,
  universities,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

/**
 * Personalized application roadmap (spec §25).
 *
 * Generates milestone tasks automatically from the user's saved universities
 * and scholarships. Tasks are created once per (profile, title) — idempotent.
 * Document requirements from scholarships become checklist tasks.
 */
export async function POST(req: Request) {
  try {
    const { profileId } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const pid = Number(profileId);

    let generated = 0;

    // ---------- Existing tasks (to avoid duplicates) ----------
    const existingTasks = await db
      .select({ title: applicationTasks.title })
      .from(applicationTasks)
      .where(eq(applicationTasks.profileId, pid));
    const existingTitles = new Set(existingTasks.map((t) => t.title));

    const ensureTask = async (title: string, category: string, dueDate: string, priority = "Medium", universityId: number | null = null) => {
      if (existingTitles.has(title)) return;
      await db.insert(applicationTasks).values({
        profileId: pid,
        universityId,
        title,
        category,
        dueDate,
        priority,
        isCompleted: false,
      });
      existingTitles.add(title);
      generated += 1;
    };

    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    // ---------- 1) Tasks from saved scholarships ----------
    const savedSch = await db
      .select()
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, pid));
    if (savedSch.length > 0) {
      const schRows = await db
        .select()
        .from(scholarships)
        .where(inArray(scholarships.id, savedSch.map((s) => s.scholarshipId)));
      for (const sch of schRows) {
        const deadline = sch.deadlineDate ? new Date(sch.deadlineDate) : new Date(today.getTime() + 45 * 86400000);
        const deadlineIso = iso(deadline);

        await ensureTask(
          `Prepare ${sch.title} application`,
          "Scholarship Application",
          deadlineIso,
          "High"
        );

        // Document checklist from required_documents.
        try {
          const docs = JSON.parse(sch.requiredDocuments || "[]") as string[];
          for (const d of docs.slice(0, 4)) {
            await ensureTask(
              `Prepare ${d.replace(/_/g, " ")} for ${sch.title}`,
              "Document Prep",
              deadlineIso,
              "Medium"
            );
          }
        } catch {
          // ignore malformed
        }
      }
    }

    // ---------- 2) Tasks from saved universities ----------
    const savedUnis = await db
      .select()
      .from(savedUniversities)
      .where(eq(savedUniversities.profileId, pid));
    if (savedUnis.length > 0) {
      const uniRows = await db
        .select()
        .from(universities)
        .where(inArray(universities.id, savedUnis.map((u) => u.universityId)));
      for (const uni of uniRows) {
        await ensureTask(
          `Research ${uni.name} program details`,
          "Research",
          iso(new Date(today.getTime() + 14 * 86400000)),
          "Low",
          uni.id
        );
        await ensureTask(
          `Prepare SOP for ${uni.name}`,
          "SOP & Essays",
          iso(new Date(today.getTime() + 30 * 86400000)),
          "High",
          uni.id
        );
        await ensureTask(
          `Request recommendation letters for ${uni.name}`,
          "Document Prep",
          iso(new Date(today.getTime() + 45 * 86400000)),
          "High",
          uni.id
        );
      }
    }

    // ---------- 3) Standard tests & general (once) ----------
    await ensureTask(
      "Book IELTS / TOEFL exam date",
      "Test Prep",
      iso(new Date(today.getTime() + 21 * 86400000)),
      "High"
    );
    await ensureTask(
      "Prepare academic transcripts (translated)",
      "Document Prep",
      iso(new Date(today.getTime() + 30 * 86400000)),
      "Medium"
    );
    await ensureTask(
      "Prepare financial documents for visa",
      "Visa & Finance",
      iso(new Date(today.getTime() + 60 * 86400000)),
      "Medium"
    );

    // Notify the user that their roadmap was built.
    if (generated > 0) {
      await createNotification({
        profileId: pid,
        type: "milestone_due",
        title: "Your roadmap is ready",
        body: `We generated ${generated} new milestone${generated === 1 ? "" : "s"} based on your saved universities and scholarships.`,
        link: "/tasks",
      });
    }

    return NextResponse.json({ ok: true, generated });
  } catch (error) {
    console.error("POST /api/roadmap/generate error:", error);
    return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 });
  }
}
