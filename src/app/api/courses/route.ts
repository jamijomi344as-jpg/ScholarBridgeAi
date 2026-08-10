import { NextResponse } from "next/server";
import { db } from "@/db";
import { courses, courseModules, lessons, lessonProgress } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { seedCourses } from "@/db/seed";

export async function GET(req: Request) {
  try {
    await seedCourses();
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;

    const allCourses = await db.select().from(courses).where(eq(courses.isPublished, true));

    const results = [];
    for (const course of allCourses) {
      const moduleRows = await db.select().from(courseModules).where(eq(courseModules.courseId, course.id));
      const moduleIds = moduleRows.map((m) => m.id);
      let lessonRows: typeof lessons.$inferSelect[] = [];
      if (moduleIds.length > 0) {
        lessonRows = await db.select().from(lessons).where(inArray(lessons.moduleId, moduleIds));
      }

      let completedLessons = 0;
      let progressPct = 0;
      if (profileId && lessonRows.length > 0) {
        const lessonIds = lessonRows.map((l) => l.id);
        const progress = await db
          .select()
          .from(lessonProgress)
          .where(inArray(lessonProgress.lessonId, lessonIds));
        const completedIds = new Set(progress.filter((p) => p.profileId === profileId && p.isCompleted).map((p) => p.lessonId));
        completedLessons = lessonRows.filter((l) => completedIds.has(l.id)).length;
        progressPct = Math.round((completedLessons / lessonRows.length) * 100);
      }

      results.push({
        ...course,
        lessonCount: lessonRows.length,
        completedLessons,
        progressPct,
      });
    }

    return NextResponse.json({ courses: results });
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
