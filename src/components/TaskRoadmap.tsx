"use client";

import React, { useState, useEffect } from "react";
import { StudentProfile } from "./Navbar";
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Trash2, 
  Check, 
  Clock, 
  AlertCircle,
  Flag,
  Layers
} from "lucide-react";

export interface TaskItem {
  id: number;
  profileId: number;
  universityId?: number | null;
  title: string;
  category: string;
  dueDate: string;
  isCompleted: boolean;
  priority: string;
  universityName?: string | null;
}

interface TaskRoadmapProps {
  activeProfile: StudentProfile | null;
}

export function TaskRoadmap({ activeProfile }: TaskRoadmapProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("All");

  // New task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Document Prep");
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [newPriority, setNewPriority] = useState("Medium");

  useEffect(() => {
    fetchTasks();
  }, [activeProfile?.id]);

  const fetchTasks = async () => {
    if (!activeProfile?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?profileId=${activeProfile.id}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (id: number, currentCompleted: boolean) => {
    // Optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !currentCompleted } : t))
    );

    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isCompleted: !currentCompleted }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !newTitle) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          title: newTitle,
          category: newCategory,
          dueDate: newDueDate,
          priority: newPriority,
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => [data.task, ...prev]);
        setNewTitle("");
        setShowAddForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filter === "Pending") return !t.isCompleted;
    if (filter === "Completed") return t.isCompleted;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Progress Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
              Application Milestones & Roadmap
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured to-do list for standardized tests, document translation, LORs, and visa appointments.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Custom Task
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
            <span>Progress: {completedCount} of {tasks.length} Milestones Completed</span>
            <span className="text-indigo-600 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 pt-2">
          {(["All", "Pending", "Completed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* New Task Inline Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Add New Milestone Task</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Task Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Schedule TOEFL Speaking practice test"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Document Prep">Document Prep</option>
                <option value="Standardized Test">Standardized Test</option>
                <option value="SOP & Essays">SOP & Essays</option>
                <option value="LOR">LOR (References)</option>
                <option value="Financials">Financials & Proof</option>
                <option value="Visa & Departure">Visa & Departure</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Save Milestone
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No tasks found under this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex items-center justify-between gap-4 ${
                t.isCompleted
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleTask(t.id, t.isCompleted)}
                  className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-colors ${
                    t.isCompleted
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-300 hover:border-indigo-500 bg-white"
                  }`}
                >
                  {t.isCompleted && <Check className="h-4 w-4" />}
                </button>

                <div className="space-y-1">
                  <span
                    className={`text-sm font-bold block ${
                      t.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {t.title}
                  </span>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                      {t.category}
                    </span>

                    <span className="flex items-center gap-1 font-semibold text-amber-700">
                      <Clock className="h-3 w-3" /> Due {t.dueDate}
                    </span>

                    {t.universityName && (
                      <span className="text-indigo-600 font-semibold">
                        🎓 {t.universityName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteTask(t.id)}
                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
