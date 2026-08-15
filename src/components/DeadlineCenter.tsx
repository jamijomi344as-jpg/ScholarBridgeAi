"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarClock,
  Loader2,
  RefreshCw,
  GraduationCap,
  Award,
  CheckSquare,
  Clock,
} from "lucide-react";

interface DeadlineItem {
  id: string;
  type: "scholarship" | "university" | "milestone";
  title: string;
  subtitle: string;
  date: string | null;
  status: string;
  daysRemaining: number | null;
  source: string | null;
  saved: boolean;
}

interface DeadlineCenterProps {
  profileId: number | null;
}

const TYPE_META: Record<DeadlineItem["type"], { label: string; icon: React.ReactNode }> = {
  scholarship: {
    label: "Scholarship",
    icon: <Award className="h-3.5 w-3.5 text-amber-500" />,
  },
  university: {
    label: "University",
    icon: <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />,
  },
  milestone: {
    label: "Milestone",
    icon: <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />,
  },
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-200 text-slate-600 border-slate-200",
  UPCOMING: "bg-amber-100 text-amber-700 border-amber-200",
  ROLLING: "bg-sky-100 text-sky-700 border-sky-200",
  "DATE NOT ANNOUNCED": "bg-slate-100 text-slate-500 border-slate-200",
  UNKNOWN: "bg-slate-100 text-slate-500 border-slate-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function DeadlineCenter({ profileId }: DeadlineCenterProps) {
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/deadlines?profileId=${profileId}`);
      const data = await res.json();
      if (res.ok && data.items) setItems(data.items);
    } catch (err) {
      console.error("Failed to load deadlines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const urgentCount = items.filter(
    (i) => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 14 && i.status !== "COMPLETED"
  ).length;
  const openCount = items.filter((i) => i.status === "OPEN").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Deadline Center</h2>
          <p className="text-xs text-slate-500">
            Unified timeline: scholarships, universities &amp; your milestones
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-bold text-red-600">
              <Clock className="h-3 w-3" /> {urgentCount} urgent (≤14 days)
            </span>
          )}
          {openCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              {openCount} open
            </span>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading deadlines…
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">
            No deadlines yet. Save scholarships and universities to build your timeline.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.milestone;
              const days = item.daysRemaining;
              const isUrgent = days !== null && days >= 0 && days <= 14 && item.status !== "COMPLETED";
              const isOverdue = days !== null && days < 0;
              return (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                  <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate text-xs font-bold text-slate-800">{item.title}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          STATUS_STYLES[item.status] || "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-500">{item.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.date ? (
                      <>
                        <p className="text-xs font-bold text-slate-700">
                          {new Date(item.date).toLocaleDateString()}
                        </p>
                        {days !== null && (
                          <p
                            className={`text-[10px] font-bold ${
                              isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-slate-400"
                            }`}
                          >
                            {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-400">Date TBA</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
