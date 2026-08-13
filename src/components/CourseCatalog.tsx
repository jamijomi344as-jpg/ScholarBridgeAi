"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PlayCircle, BookOpen, Clock, BarChart3 } from "lucide-react";

export interface CourseItem {
  id: number;
  title: string;
  description: string;
  instructorName: string;
  level: string;
  thumbnailUrl: string;
  isPublished: boolean;
  createdAt: string;
  lessonCount: number;
  completedLessons: number;
  progressPct: number;
}

interface CourseCatalogProps {
  courses: CourseItem[];
  onOpen: (courseId: number) => void;
}

export function CourseCatalog({ courses, onOpen }: CourseCatalogProps) {
  const t = useTranslations("courses");

  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
        <BookOpen className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">{t("noCourses")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((course) => {
        const inProgress = course.progressPct > 0 && course.progressPct < 100;
        const done = course.progressPct >= 100;
        return (
          <div
            key={course.id}
            onClick={() => onOpen(course.id)}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer flex flex-col"
          >
            <div className="relative h-40 bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt={course.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-white/60" />
                </div>
              )}
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">
                {course.level}
              </div>
              {done && (
                <div className="absolute inset-0 bg-emerald-600/70 flex items-center justify-center">
                  <span className="text-white font-extrabold text-lg">✓ {t("certificate")}</span>
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-bold text-slate-900 text-sm leading-snug">{course.title}</h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{course.description}</p>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-3">
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.lessonCount} {t("lessons")}</span>
                <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {course.progressPct}%</span>
              </div>

              <div className="mt-3">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${course.progressPct}%` }} />
                </div>
              </div>

              <div className="mt-auto pt-3">
                <button
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    inProgress ? "bg-amber-500 text-white hover:bg-amber-600" : done ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  <PlayCircle className="h-4 w-4" />
                  {done ? t("viewCertificate") : inProgress ? t("continueCourse") : t("startCourse")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
