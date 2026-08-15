"use client";

import React, { useEffect, useState } from "react";
import {
  Video,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Layers,
  PlayCircle,
  FileQuestion,
  CheckCircle2,
} from "lucide-react";

interface CoursesManagerProps {
  adminProfileId: number;
}

interface CourseRow {
  id: number;
  title: string;
  description: string;
  instructorName: string;
  level: string;
  thumbnailUrl: string;
  isPublished: boolean;
  moduleCount?: number;
  lessonCount?: number;
}

interface QuestionDraft {
  question: string;
  options: string; // JSON string array, e.g. ["A","B"]
  correctOptionIndex: string;
}

interface QuizDraft {
  title: string;
  passThreshold: string;
  questions: QuestionDraft[];
}

interface LessonDraft {
  title: string;
  videoUrl: string;
  durationSeconds: string;
  content: string;
  quiz: QuizDraft | null;
}

interface ModuleDraft {
  title: string;
  description: string;
  lessons: LessonDraft[];
}

interface CourseDraft {
  id: number | null;
  title: string;
  description: string;
  instructorName: string;
  level: string;
  thumbnailUrl: string;
  isPublished: boolean;
  categoryId: string;
  instructorId: string;
  studentExperience: string;
  modules: ModuleDraft[];
}

const emptyModule = (): ModuleDraft => ({
  title: "",
  description: "",
  lessons: [],
});

const emptyLesson = (): LessonDraft => ({
  title: "",
  videoUrl: "",
  durationSeconds: "",
  content: "",
  quiz: null,
});

const emptyQuestion = (): QuestionDraft => ({
  question: "",
  options: '["Option A","Option B"]',
  correctOptionIndex: "0",
});

const emptyQuiz = (): QuizDraft => ({
  title: "Lesson Quiz",
  passThreshold: "70",
  questions: [emptyQuestion()],
});

const emptyCourse = (): CourseDraft => ({
  id: null,
  title: "",
  description: "",
  instructorName: "ScholarBridge Academy",
  level: "Beginner",
  thumbnailUrl: "",
  isPublished: true,
  categoryId: "",
  instructorId: "",
  studentExperience: "",
  modules: [],
});

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500";

export function CoursesManager({ adminProfileId }: CoursesManagerProps) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [loadingCourse, setLoadingCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCourses = async () => {
    try {
      const res = await fetch(`/api/admin/courses?adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch courses");
      setCourses(data.courses || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const startNew = () => {
    setDraft(emptyCourse());
    setExpanded({});
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = async (c: CourseRow) => {
    setLoadingCourse(c.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/admin/courses?adminProfileId=${adminProfileId}&id=${c.id}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load course");
      const course = data.course;
      const d: CourseDraft = {
        id: course.id,
        title: course.title,
        description: course.description,
        instructorName: course.instructorName,
        level: course.level,
        thumbnailUrl: course.thumbnailUrl,
        isPublished: course.isPublished,
        categoryId: course.categoryId ? String(course.categoryId) : "",
        instructorId: course.instructorId ? String(course.instructorId) : "",
        studentExperience: course.studentExperience || "",
        modules: (course.modules || []).map((m: any) => ({
          title: m.title,
          description: m.description,
          lessons: (m.lessons || []).map((l: any) => ({
            title: l.title,
            videoUrl: l.videoUrl,
            durationSeconds: String(l.durationSeconds ?? ""),
            content: l.content,
            quiz: l.quiz
              ? {
                  title: l.quiz.title,
                  passThreshold: String(l.quiz.passThreshold ?? ""),
                  questions: (l.quiz.questions || []).map((q: any) => ({
                    question: q.question,
                    options: Array.isArray(q.options) ? JSON.stringify(q.options) : String(q.options ?? ""),
                    correctOptionIndex: String(q.correctOptionIndex ?? ""),
                  })),
                }
              : null,
          })),
        })),
      };
      setDraft(d);
      setExpanded(Object.fromEntries(d.modules.map((_, i) => [i, true])));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Failed to load course");
    } finally {
      setLoadingCourse(null);
    }
  };

  const cancelEdit = () => {
    setDraft(null);
    setError("");
    setSuccess("");
  };

  // ---- draft update helpers ----
  const updateTop = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const updateModule = (mi: number, patch: Partial<ModuleDraft>) => {
    setDraft((d) =>
      d ? { ...d, modules: d.modules.map((m, i) => (i === mi ? { ...m, ...patch } : m)) } : d
    );
  };

  const updateLesson = (mi: number, li: number, patch: Partial<LessonDraft>) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            modules: d.modules.map((m, i) =>
              i === mi
                ? { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)) }
                : m
            ),
          }
        : d
    );
  };

  const updateQuiz = (mi: number, li: number, patch: Partial<QuizDraft>) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            modules: d.modules.map((m, i) =>
              i === mi
                ? {
                    ...m,
                    lessons: m.lessons.map((l, j) =>
                      j === li && l.quiz ? { ...l, quiz: { ...l.quiz, ...patch } } : l
                    ),
                  }
                : m
            ),
          }
        : d
    );
  };

  const updateQuestion = (mi: number, li: number, qi: number, patch: Partial<QuestionDraft>) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            modules: d.modules.map((m, i) =>
              i === mi
                ? {
                    ...m,
                    lessons: m.lessons.map((l, j) =>
                      j === li && l.quiz
                        ? {
                            ...l,
                            quiz: {
                              ...l.quiz,
                              questions: l.quiz.questions.map((q, k) =>
                                k === qi ? { ...q, ...patch } : q
                              ),
                            },
                          }
                        : l
                    ),
                  }
                : m
            ),
          }
        : d
    );
  };

  const addModule = () => {
    setDraft((d) => (d ? { ...d, modules: [...d.modules, emptyModule()] } : d));
    if (draft) setExpanded((e) => ({ ...e, [draft.modules.length]: true }));
  };

  const removeModule = (mi: number) => {
    setDraft((d) => (d ? { ...d, modules: d.modules.filter((_, i) => i !== mi) } : d));
  };

  const addLesson = (mi: number) => {
    updateModule(mi, { lessons: [...draft!.modules[mi].lessons, emptyLesson()] });
  };

  const removeLesson = (mi: number, li: number) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            modules: d.modules.map((m, i) =>
              i === mi ? { ...m, lessons: m.lessons.filter((_, j) => j !== li) } : m
            ),
          }
        : d
    );
  };

  const addQuiz = (mi: number, li: number) => {
    updateLesson(mi, li, { quiz: emptyQuiz() });
  };

  const removeQuiz = (mi: number, li: number) => {
    updateLesson(mi, li, { quiz: null });
  };

  const addQuestion = (mi: number, li: number) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            modules: d.modules.map((m, i) =>
              i === mi
                ? {
                    ...m,
                    lessons: m.lessons.map((l, j) =>
                      j === li && l.quiz
                        ? { ...l, quiz: { ...l.quiz, questions: [...l.quiz.questions, emptyQuestion()] } }
                        : l
                    ),
                  }
                : m
            ),
          }
        : d
    );
  };

  const removeQuestion = (mi: number, li: number, qi: number) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            modules: d.modules.map((m, i) =>
              i === mi
                ? {
                    ...m,
                    lessons: m.lessons.map((l, j) =>
                      j === li && l.quiz
                        ? {
                            ...l,
                            quiz: {
                              ...l.quiz,
                              questions: l.quiz.questions.filter((_, k) => k !== qi),
                            },
                          }
                        : l
                    ),
                  }
                : m
            ),
          }
        : d
    );
  };

  const toggleModule = (mi: number) => {
    setExpanded((e) => ({ ...e, [mi]: !e[mi] }));
  };

  // ---- save / delete ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const top = {
        title: draft.title,
        description: draft.description,
        instructorName: draft.instructorName,
        level: draft.level,
        thumbnailUrl: draft.thumbnailUrl,
        isPublished: draft.isPublished,
        categoryId: draft.categoryId ? Number(draft.categoryId) : null,
        instructorId: draft.instructorId ? Number(draft.instructorId) : null,
        studentExperience: draft.studentExperience,
      };

      if (draft.id == null) {
        const course = {
          ...top,
          modules: draft.modules.map((m, mi) => ({
            title: m.title,
            description: m.description,
            lessons: m.lessons.map((l, li) => ({
              title: l.title,
              videoUrl: l.videoUrl,
              durationSeconds: Number(l.durationSeconds) || 0,
              content: l.content,
              quiz: l.quiz
                ? {
                    title: l.quiz.title,
                    passThreshold: Number(l.quiz.passThreshold) || 70,
                    questions: l.quiz.questions.map((q, qi) => ({
                      question: q.question,
                      options: q.options,
                      correctOptionIndex: Number(q.correctOptionIndex) || 0,
                      sortOrder: qi + 1,
                    })),
                  }
                : null,
            })),
          })),
        };
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminProfileId, course }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create course");
        setSuccess("Course created.");
      } else {
        // Existing courses: update top-level course fields only.
        const res = await fetch("/api/admin/courses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminProfileId, id: draft.id, course: top }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update course");
        setSuccess("Course updated.");
      }
      cancelEdit();
      await fetchCourses();
    } catch (err: any) {
      setError(err.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CourseRow) => {
    if (!window.confirm(`Delete course "${c.title}"? Modules, lessons and quizzes will also be removed.`)) return;
    setError("");
    try {
      const res = await fetch(
        `/api/admin/courses?id=${c.id}&adminProfileId=${adminProfileId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete course");
      setSuccess("Course deleted.");
      await fetchCourses();
    } catch (err: any) {
      setError(err.message || "Failed to delete course");
    }
  };

  // ================= LIST VIEW =================
  if (!draft) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <Video className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Courses Manager</h2>
            <p className="text-xs text-slate-500">
              {courses.length} course{courses.length === 1 ? "" : "s"} on the platform
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={fetchCourses}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" /> New Course
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
            {success}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
            </div>
          ) : courses.length === 0 ? (
            <p className="p-8 text-center text-xs font-semibold text-slate-500">
              No courses yet — click &quot;New Course&quot; to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-bold">Course</th>
                    <th className="px-4 py-3 font-bold">Level</th>
                    <th className="px-4 py-3 font-bold">Instructor</th>
                    <th className="px-4 py-3 font-bold">Content</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{c.title}</div>
                        <div className="max-w-xs truncate text-[11px] text-slate-500">{c.description}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.level}</td>
                      <td className="px-4 py-3 text-slate-600">{c.instructorName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.moduleCount ?? 0} modules · {c.lessonCount ?? 0} lessons
                      </td>
                      <td className="px-4 py-3">
                        {c.isPublished ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(c)}
                            disabled={loadingCourse === c.id}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-violet-600 hover:bg-violet-50 disabled:opacity-60"
                          >
                            {loadingCourse === c.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Pencil className="h-3 w-3" />
                            )}
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= EDITOR VIEW =================
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
          {draft.id != null ? (
            <Pencil className="h-5 w-5 text-violet-600" />
          ) : (
            <Plus className="h-5 w-5 text-violet-600" />
          )}
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">
            {draft.id != null ? "Edit Course" : "New Course"}
          </h2>
          <p className="text-xs text-slate-500">
            {draft.id != null
              ? "Saving updates the top-level course fields. Modules, lessons and quizzes are set at creation time."
              : "Build the course, then add modules with lessons and quizzes."}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {draft.id != null ? "Save Course" : "Create Course"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Top-level course fields */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-extrabold text-slate-800">Course Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Title</label>
            <input
              value={draft.title}
              onChange={(e) => updateTop("title", e.target.value)}
              className={inputCls}
              placeholder="Course title"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => updateTop("description", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="What will students learn?"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Instructor Name</label>
            <input
              value={draft.instructorName}
              onChange={(e) => updateTop("instructorName", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Level</label>
            <select
              value={draft.level}
              onChange={(e) => updateTop("level", e.target.value)}
              className={inputCls}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category ID (video platform)</label>
            <input
              value={draft.categoryId}
              onChange={(e) => updateTop("categoryId", e.target.value)}
              className={inputCls}
              placeholder="Category id (see Categories in admin)"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Instructor ID (video platform)</label>
            <input
              value={draft.instructorId}
              onChange={(e) => updateTop("instructorId", e.target.value)}
              className={inputCls}
              placeholder="Instructor id (see Instructors in admin)"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Student Experience (sharing story)</label>
            <textarea
              value={draft.studentExperience}
              onChange={(e) => updateTop("studentExperience", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Real student's journey — how they prepared, applied, got funded…"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Thumbnail URL</label>
            <input
              value={draft.thumbnailUrl}
              onChange={(e) => updateTop("thumbnailUrl", e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={draft.isPublished}
            onChange={(e) => updateTop("isPublished", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          Published (visible to students)
        </label>
      </div>

      {/* Modules */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-extrabold text-slate-800">
            Modules ({draft.modules.length})
          </h3>
          <button
            type="button"
            onClick={addModule}
            className="ml-auto flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100"
          >
            <Plus className="h-3 w-3" /> Add Module
          </button>
        </div>

        {draft.modules.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-500">
            No modules yet — add one to start building lessons.
          </p>
        )}

        {draft.modules.map((m, mi) => (
          <div key={mi} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleModule(mi)}
                className="flex items-center gap-1 text-xs font-extrabold text-slate-700"
              >
                {expanded[mi] ? (
                  <ChevronDown className="h-4 w-4 text-violet-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-violet-600" />
                )}
                Module {mi + 1}
              </button>
              <button
                type="button"
                onClick={() => addLesson(mi)}
                className="ml-auto flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-violet-700"
              >
                <PlayCircle className="h-3 w-3" /> Add Lesson
              </button>
              <button
                type="button"
                onClick={() => removeModule(mi)}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {expanded[mi] && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Module Title
                    </label>
                    <input
                      value={m.title}
                      onChange={(e) => updateModule(mi, { title: e.target.value })}
                      className={inputCls}
                      placeholder={`Module ${mi + 1} title`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Module Description
                    </label>
                    <input
                      value={m.description}
                      onChange={(e) => updateModule(mi, { description: e.target.value })}
                      className={inputCls}
                      placeholder="Short summary of this module"
                    />
                  </div>
                </div>

                {m.lessons.length === 0 && (
                  <p className="text-[11px] font-semibold text-slate-500">
                    No lessons in this module yet.
                  </p>
                )}

                {m.lessons.map((l, li) => (
                  <div key={li} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-violet-600" />
                      <span className="text-xs font-extrabold text-slate-700">Lesson {li + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeLesson(mi, li)}
                        className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Lesson Title
                        </label>
                        <input
                          value={l.title}
                          onChange={(e) => updateLesson(mi, li, { title: e.target.value })}
                          className={inputCls}
                          placeholder="Lesson title"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Video URL
                        </label>
                        <input
                          value={l.videoUrl}
                          onChange={(e) => updateLesson(mi, li, { videoUrl: e.target.value })}
                          className={inputCls}
                          placeholder="https://…"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Duration (seconds)
                        </label>
                        <input
                          type="number"
                          value={l.durationSeconds}
                          onChange={(e) => updateLesson(mi, li, { durationSeconds: e.target.value })}
                          className={inputCls}
                          placeholder="300"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Content
                        </label>
                        <textarea
                          value={l.content}
                          onChange={(e) => updateLesson(mi, li, { content: e.target.value })}
                          rows={2}
                          className={inputCls}
                          placeholder="Lesson notes / transcript summary"
                        />
                      </div>
                    </div>

                    {/* Quiz */}
                    {l.quiz ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <FileQuestion className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-extrabold text-slate-700">Quiz</span>
                          <button
                            type="button"
                            onClick={() => removeQuiz(mi, li)}
                            className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" /> Remove Quiz
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Quiz Title
                            </label>
                            <input
                              value={l.quiz.title}
                              onChange={(e) => updateQuiz(mi, li, { title: e.target.value })}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Pass Threshold (%)
                            </label>
                            <input
                              type="number"
                              value={l.quiz.passThreshold}
                              onChange={(e) => updateQuiz(mi, li, { passThreshold: e.target.value })}
                              className={inputCls}
                              placeholder="70"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wide">
                              Questions ({l.quiz.questions.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => addQuestion(mi, li)}
                              className="ml-auto flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"
                            >
                              <Plus className="h-3 w-3" /> Add Question
                            </button>
                          </div>

                          {l.quiz.questions.map((q, qi) => (
                            <div key={qi} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-extrabold text-slate-600">Q{qi + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(mi, li, qi)}
                                  className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-1.5 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                  Question
                                </label>
                                <textarea
                                  value={q.question}
                                  onChange={(e) => updateQuestion(mi, li, qi, { question: e.target.value })}
                                  rows={1}
                                  className={inputCls}
                                  placeholder="What is the correct answer?"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                    Options (JSON array)
                                  </label>
                                  <textarea
                                    value={q.options}
                                    onChange={(e) => updateQuestion(mi, li, qi, { options: e.target.value })}
                                    rows={1}
                                    className={inputCls}
                                    placeholder='["Option A","Option B","Option C"]'
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                    Correct Option Index
                                  </label>
                                  <input
                                    type="number"
                                    value={q.correctOptionIndex}
                                    onChange={(e) =>
                                      updateQuestion(mi, li, qi, { correctOptionIndex: e.target.value })
                                    }
                                    className={inputCls}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addQuiz(mi, li)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                      >
                        <FileQuestion className="h-3 w-3" /> Add Quiz
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {draft.id != null ? "Save Course" : "Create Course"}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </form>
  );
}
