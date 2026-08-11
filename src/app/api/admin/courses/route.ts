import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  courses,
  courseModules,
  lessons,
  quizzes,
  quizQuestions,
} from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { eq, asc, inArray } from "drizzle-orm";

function safeParse(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toBool(value: any): boolean {
  return value === true || value === "true";
}

/** Load a course with its full nested structure: modules -> lessons -> quiz -> questions. */
async function getNestedCourse(courseId: number) {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return null;

  const moduleRows = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(asc(courseModules.sortOrder));

  const modules = [];
  for (const mod of moduleRows) {
    const lessonRows = await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, mod.id))
      .orderBy(asc(lessons.sortOrder));

    const lessonData = [];
    for (const lesson of lessonRows) {
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lesson.id));
      let quizData = null;
      if (quiz) {
        const questions = await db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, quiz.id))
          .orderBy(asc(quizQuestions.sortOrder));
        quizData = {
          id: quiz.id,
          title: quiz.title,
          passThreshold: quiz.passThreshold,
          questions: questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: safeParse(q.options),
            correctOptionIndex: q.correctOptionIndex,
          })),
        };
      }
      lessonData.push({ ...lesson, quiz: quizData });
    }
    modules.push({ ...mod, lessons: lessonData });
  }

  return { ...course, modules };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");
    if (!(await isAdmin(adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = Number(idStr);
      if (!id) {
        return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
      }
      const course = await getNestedCourse(id);
      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }
      return NextResponse.json({ course });
    }

    const allCourses = await db.select().from(courses);
    const results = [];
    for (const course of allCourses) {
      const moduleRows = await db
        .select()
        .from(courseModules)
        .where(eq(courseModules.courseId, course.id));
      const moduleIds = moduleRows.map((m) => m.id);
      let lessonCount = 0;
      if (moduleIds.length > 0) {
        const lessonRows = await db
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, moduleIds));
        lessonCount = lessonRows.length;
      }
      results.push({ ...course, moduleCount: moduleRows.length, lessonCount });
    }

    return NextResponse.json({ courses: results });
  } catch (error) {
    console.error("GET /api/admin/courses error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }
    const courseDef = body.course || {};

    const [course] = await db
      .insert(courses)
      .values({
        title: courseDef.title || "Untitled Course",
        description: courseDef.description || "",
        instructorName: courseDef.instructorName || "ScholarBridge Academy",
        level: courseDef.level || "Beginner",
        thumbnailUrl: courseDef.thumbnailUrl || "",
        isPublished: courseDef.isPublished == null ? true : toBool(courseDef.isPublished),
      })
      .returning();

    if (Array.isArray(courseDef.modules)) {
      for (let m = 0; m < courseDef.modules.length; m++) {
        const mod = courseDef.modules[m];
        const [insertedModule] = await db
          .insert(courseModules)
          .values({
            courseId: course.id,
            title: mod.title || `Module ${m + 1}`,
            description: mod.description || "",
            sortOrder: m + 1,
          })
          .returning();

        if (Array.isArray(mod.lessons)) {
          for (let l = 0; l < mod.lessons.length; l++) {
            const lesson = mod.lessons[l];
            const [insertedLesson] = await db
              .insert(lessons)
              .values({
                moduleId: insertedModule.id,
                title: lesson.title || `Lesson ${l + 1}`,
                videoUrl: lesson.videoUrl || "",
                durationSeconds: Number(lesson.durationSeconds) || 0,
                content: lesson.content || "",
                sortOrder: l + 1,
              })
              .returning();

            const quiz = lesson.quiz;
            if (quiz) {
              const [insertedQuiz] = await db
                .insert(quizzes)
                .values({
                  lessonId: insertedLesson.id,
                  title: quiz.title || "Lesson Quiz",
                  passThreshold: Number(quiz.passThreshold) || 70,
                })
                .returning();

              if (Array.isArray(quiz.questions)) {
                await db.insert(quizQuestions).values(
                  quiz.questions.map((q: any, qi: number) => ({
                    quizId: insertedQuiz.id,
                    question: q.question || "",
                    options:
                      typeof q.options === "string" ? q.options : JSON.stringify(q.options ?? []),
                    correctOptionIndex: Number(q.correctOptionIndex) || 0,
                    sortOrder: qi + 1,
                  }))
                );
              }
            }
          }
        }
      }
    }

    const nested = await getNestedCourse(course.id);
    return NextResponse.json({ course: nested });
  } catch (error) {
    console.error("POST /api/admin/courses error:", error);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
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
      return NextResponse.json({ error: "Course id is required" }, { status: 400 });
    }
    const [existing] = await db.select().from(courses).where(eq(courses.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseDef = body.course || {};
    const [course] = await db
      .update(courses)
      .set({
        title: courseDef.title || existing.title,
        description: courseDef.description ?? existing.description,
        instructorName: courseDef.instructorName || existing.instructorName,
        level: courseDef.level || existing.level,
        thumbnailUrl: courseDef.thumbnailUrl ?? existing.thumbnailUrl,
        isPublished: courseDef.isPublished == null ? existing.isPublished : toBool(courseDef.isPublished),
      })
      .where(eq(courses.id, id))
      .returning();

    return NextResponse.json({ course });
  } catch (error) {
    console.error("PATCH /api/admin/courses error:", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
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
      return NextResponse.json({ error: "Course id is required" }, { status: 400 });
    }
    await db.delete(courses).where(eq(courses.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/courses error:", error);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
