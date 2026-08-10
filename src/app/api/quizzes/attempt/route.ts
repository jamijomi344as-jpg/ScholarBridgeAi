import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizzes, quizQuestions, quizAttempts, lessons, courseModules, courses } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { maybeIssueCertificate } from "@/lib/certificates";
import { awardPoints } from "@/lib/gamification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quizId, profileId, answers } = body;

    if (!quizId || !profileId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "quizId, profileId and answers are required" }, { status: 400 });
    }

    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, Number(quizId)));
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(asc(quizQuestions.sortOrder));

    let correct = 0;
    questions.forEach((q, index) => {
      const chosen = answers[index];
      if (Number(chosen) === q.correctOptionIndex) {
        correct += 1;
      }
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= quiz.passThreshold;

    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        quizId: quiz.id,
        profileId: Number(profileId),
        score,
        answers: JSON.stringify(answers),
        passed,
      })
      .returning();

    let award = null;
    let certificate = null;

    if (passed) {
      try {
        award = await awardPoints(Number(profileId), 15, "quiz_passed", quiz.id);
      } catch (err) {
        console.error("Failed to award quiz points:", err);
      }

      // Attempt certificate issuance (all lessons + quizzes required).
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId));
      if (lesson) {
        const [module] = await db.select().from(courseModules).where(eq(courseModules.id, lesson.moduleId));
        if (module) {
          certificate = await maybeIssueCertificate(Number(profileId), module.courseId);
        }
      }
    }

    return NextResponse.json({
      attempt,
      score,
      passed,
      correct,
      total: questions.length,
      passThreshold: quiz.passThreshold,
      award,
      certificate,
    });
  } catch (error) {
    console.error("POST /api/quizzes/attempt error:", error);
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 });
  }
}
