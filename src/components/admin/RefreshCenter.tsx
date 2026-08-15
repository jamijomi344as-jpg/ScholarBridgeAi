"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Loader2, History } from "lucide-react";

interface RefreshCenterProps {
  adminProfileId: number;
}

interface JobRow {
  id: number;
  jobType: string;
  status: string;
  trigger: string;
  itemsProcessed: number;
  itemsChanged: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export function RefreshCenter({ adminProfileId }: RefreshCenterProps) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/refresh?adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (res.ok && data.jobs) setJobs(data.jobs);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const run = async (scope: "all" | "scholarships" | "universities") => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      setMessage(
        `Done: ${data.processed} processed, ${data.changed} changed, ${data.discovered} discovered`
      );
      load();
    } catch (err: any) {
      setMessage(err.message || "Refresh failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Data Refresh Center</h2>
            <p className="text-xs text-slate-500">Manual refresh — scheduled runs come from the cron endpoint (CRON_SECRET).</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => run("all")}
            disabled={running}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh All
          </button>
          <button
            onClick={() => run("scholarships")}
            disabled={running}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Scholarships
          </button>
          <button
            onClick={() => run("universities")}
            disabled={running}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Universities
          </button>
        </div>
        {message && <p className="mt-3 text-xs font-semibold text-indigo-700">{message}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Recent Jobs
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : jobs.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">No jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">Started</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Trigger</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Processed</th>
                  <th className="px-4 py-3 font-bold">Changed</th>
                  <th className="px-4 py-3 font-bold">Error</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {j.startedAt ? new Date(j.startedAt).toLocaleString() : new Date(j.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-700">{j.jobType}</td>
                    <td className="px-4 py-2.5 text-slate-500">{j.trigger}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          j.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : j.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{j.itemsProcessed}</td>
                    <td className="px-4 py-2.5 text-slate-600">{j.itemsChanged}</td>
                    <td className="px-4 py-2.5 text-red-600 max-w-[200px] truncate">{j.error || "—"}</td>
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
