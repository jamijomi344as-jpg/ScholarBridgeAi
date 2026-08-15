"use client";

import React, { useEffect, useState } from "react";
import { Headset, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";

interface ConsultingManagerProps {
  adminProfileId: number;
}

interface RequestRow {
  id: number;
  profileId: number;
  topic: string;
  message: string;
  preferredContact: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  studentName: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-100 text-amber-700 border-amber-200",
  in_review: "bg-sky-100 text-sky-700 border-sky-200",
  scheduled: "bg-indigo-100 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  declined: "bg-slate-200 text-slate-600 border-slate-200",
};

export function ConsultingManager({ adminProfileId }: ConsultingManagerProps) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/consulting?adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (res.ok && data.requests) setRequests(data.requests);
    } catch (err) {
      console.error("Failed to load consulting requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const setStatus = async (id: number, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/consulting", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, id, status }),
      });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Headset className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Consulting Requests</h2>
          <p className="text-xs text-slate-500">
            {requests.filter((r) => r.status === "new").length} new · manage statuses and follow up
          </p>
        </div>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : requests.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">No consulting requests yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((r) => (
              <div key={r.id} className="px-4 py-3.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-800">{r.topic}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          STATUS_STYLES[r.status] || "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <b>{r.studentName || `Profile #${r.profileId}`}</b> · {r.preferredContact || "no contact"} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {r.message && (
                      <p className="text-[11px] text-slate-600 mt-1.5 bg-slate-50 rounded-xl px-3 py-2">{r.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.status !== "completed" && (
                      <button
                        onClick={() => setStatus(r.id, "completed")}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Complete
                      </button>
                    )}
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                      disabled={busyId === r.id}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600"
                    >
                      <option value="new">New</option>
                      <option value="in_review">In review</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
