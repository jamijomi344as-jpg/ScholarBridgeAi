import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessonProgress, lessons, courseModules, courses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { maybeIssueCertificate } from "@/lib/certificates";
import { awardPoints } from "@/lib/gamification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, lessonId, watchedSeconds } = body;

    if (!profileId || !lessonId || typeof watchedSeconds !== "number") {
      return NextResponse.json({ error: "profileId, lessonId and watchedSeconds are required" }, { status: 400 });
    }

    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, Number(lessonId)));
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.profileId, Number(profileId)),
          eq(lessonProgress.lessonId, Number(lessonId))
        )
      );

    const seconds = Math.max(existing?.watchedSeconds ?? 0, Math.floor(watchedSeconds));
    const isCompleted =
      existing?.isCompleted ?? (seconds >= lesson.durationSeconds && lesson.durationSeconds > 0);

    let row;
    if (existing) {
      [row] = await db
        .update(lessonProgress)
        .set({
          watchedSeconds: seconds,
          isCompleted,
          updatedAt: new Date(),
        })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(lessonProgress)
        .values({
          profileId: Number(profileId),
          lessonId: Number(lessonId),
          watchedSeconds: seconds,
          isCompleted,
        })
        .returning();
    }

    let award = null;
    let certificate = null;

    // On first completion: award points and attempt auto-issuing a certificate.
    if (isCompleted && !(existing?.isCompleted ?? false)) {
      try {
        award = await awardPoints(Number(profileId), 10, "lesson_complete", Number(lessonId));
      } catch (err) {
        console.error("Failed to award lesson points:", err);
      }

      // Find the parent course to check for certificate eligibility.
      const [module] = await db.select().from(courseModules).where(eq(courseModules.id, lesson.moduleId));
      if (module) {
        const [course] = await db.select().from(courses).where(eq(courses.id, module.courseId));
        if (course) {
          certificate = await maybeIssueCertificate(Number(profileId), course.id);
        }
      }
    }

    return NextResponse.json({ progress: row, award, certificate });
  } catch (error) {
    console.error("POST /api/courses/progress error:", error);
    return NextResponse.json({ error: "Failed to update lesson progress" }, { status: 500 });
  }
}
