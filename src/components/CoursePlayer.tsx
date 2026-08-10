"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Circle, BookOpen, Award, Clock } from "lucide-react";
import { LessonQuiz, Quiz } from "./LessonQuiz";
import { CertificateView } from "./CertificateView";

interface LessonDetail {
  id: number;
  moduleId: number;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  content: string;
  sortOrder: number;
  progress: { id: number; watchedSeconds: number; isCompleted: boolean } | null;
  quiz: Quiz | null;
}

interface CourseDetail {
  course: {
    id: number;
    title: string;
    description: string;
    instructorName: string;
    level: string;
  };
  modules: {
    id: number;
    title: string;
    description: string;
    lessons: LessonDetail[];
  }[];
  totalLessons: number;
  completedLessons: number;
  progressPct: number;
  certificate: { id: number; certificateCode: string; issuedAt: string } | null;
}

interface CoursePlayerProps {
  courseId: number;
  profileId: number;
  profileName: string;
  onBack: () => void;
}

export function CoursePlayer({ courseId, profileId, profileName, onBack }: CoursePlayerProps) {
  const t = useTranslations("courses");
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ [lessonId: number]: { score: number; passed: boolean } }>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReport = useRef(0);

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}?profileId=${profileId}`);
      const data = await res.json();
      if (data.course) {
        setDetail(data);
        const firstIncomplete =
          data.modules.flatMap((m: { lessons: LessonDetail[] }) => m.lessons).find((l: LessonDetail) => !l.progress?.isCompleted);
        setSelectedLessonId(firstIncomplete?.id ?? data.modules[0]?.lessons[0]?.id ?? null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [courseId, profileId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const selectedLesson =
    detail?.modules.flatMap((m) => m.lessons).find((l) => l.id === selectedLessonId) ?? null;

  const reportProgress = async (seconds: number, forceComplete = false) => {
    if (!selectedLessonId) return;
    try {
      await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, lessonId: selectedLessonId, watchedSeconds: seconds }),
      });
      if (forceComplete) loadDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !selectedLesson) return;
    const now = video.currentTime;
    if (now - lastReport.current >= 5 || (selectedLesson.durationSeconds > 0 && now >= selectedLesson.durationSeconds)) {
      lastReport.current = now;
      reportProgress(Math.floor(now));
    }
  };

  const handleEnded = () => {
    if (!selectedLesson) return;
    lastReport.current = selectedLesson.durationSeconds;
    reportProgress(selectedLesson.durationSeconds, true);
  };

  const handleQuizCompleted = (lessonId: number, result: { score: number; passed: boolean }) => {
    setQuizResult((prev) => ({ ...prev, [lessonId]: result }));
    setTimeout(() => loadDetail(), 400);
  };

  if (!detail) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
        <p className="text-sm text-slate-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </button>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            {detail.completedLessons}/{detail.totalLessons} {t("lessons")} · {detail.progressPct}% {t("courseProgress")}
          </div>
          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${detail.progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lesson sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 h-fit space-y-4">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">{detail.course.title}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t("instructor")}: {detail.course.instructorName}
            </p>
          </div>

          <div className="space-y-3">
            {detail.modules.map((module, mIdx) => (
              <div key={module.id}>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  {mIdx + 1}. {module.title}
                </p>
                <div className="space-y-1">
                  {module.lessons.map((lesson, lIdx) => {
                    const isActive = selectedLessonId === lesson.id;
                    const isDone = lesson.progress?.isCompleted;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-start gap-2 transition-colors ${
                          isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-emerald-300" : "text-emerald-500"}`} />
                        ) : (
                          <Circle className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-white/70" : "text-slate-300"}`} />
                        )}
                        <span className="text-xs font-medium leading-tight">
                          {lIdx + 1}. {lesson.title}
                          <span className={`block text-[10px] mt-0.5 ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
                            <Clock className="h-3 w-3 inline mr-0.5" />
                            {Math.round((lesson.durationSeconds || 0) / 60)}m
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player / content */}
        <div className="lg:col-span-2 space-y-4">
          {selectedLesson && (
            <>
              <div className="bg-slate-900 rounded-2xl overflow-hidden">
                <video
                  key={selectedLesson.id}
                  ref={videoRef}
                  src={selectedLesson.videoUrl}
                  controls
                  className="w-full aspect-video"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  preload="metadata"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <h3 className="font-bold text-slate-900 text-base">{selectedLesson.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedLesson.progress?.isCompleted ? `✓ ${t("markComplete")}` : `${t("watchToComplete")}`}
                </p>
                {selectedLesson.content && (
                  <p className="text-xs sm:text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-wrap">
                    {selectedLesson.content}
                  </p>
                )}
              </div>

              {selectedLesson.quiz && (
                <LessonQuiz
                  quiz={selectedLesson.quiz}
                  profileId={profileId}
                  onCompleted={(r) => handleQuizCompleted(selectedLesson.id, r)}
                />
              )}
            </>
          )}

          {detail.certificate && (
            <CertificateView certificate={detail.certificate} profileName={profileName} />
          )}
        </div>
      </div>
    </div>
  );
}
