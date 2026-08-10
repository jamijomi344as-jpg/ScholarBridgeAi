"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { CourseCatalog, CourseItem } from "./CourseCatalog";
import { CoursePlayer } from "./CoursePlayer";

interface CoursesSectionProps {
  activeProfile: StudentProfile | null;
}

export function CoursesSection({ activeProfile }: CoursesSectionProps) {
  const t = useTranslations("courses");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCourseId, setOpenCourseId] = useState<number | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses${activeProfile ? `?profileId=${activeProfile.id}` : ""}`);
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold">{t("title")}</h1>
            <p className="text-xs text-slate-300 mt-0.5">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {openCourseId && activeProfile ? (
        <CoursePlayer
          courseId={openCourseId}
          profileId={activeProfile.id}
          profileName={activeProfile.name}
          onBack={() => {
            setOpenCourseId(null);
            loadCourses();
          }}
        />
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
          <p className="text-sm text-slate-500">{t("loading")}</p>
        </div>
      ) : (
        <CourseCatalog courses={courses} onOpen={setOpenCourseId} />
      )}
    </div>
  );
}
