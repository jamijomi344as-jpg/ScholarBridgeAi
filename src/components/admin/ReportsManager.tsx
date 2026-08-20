"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Trash2, CheckCircle2, XCircle, RefreshCw, Loader2, Flag, AlertCircle } from "lucide-react";

interface ReportsManagerProps {
  adminProfileId: number;
}

interface ReportRow {
  id: number;
  reporterId: number;
  targetType: "thread" | "reply";
  targetId: number;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  reporterName: string | null;
}

/**
 * Admin Reports manager — every report submitted from the community shows
 * here. New (open) reports are highlighted; admins can resolve, dismiss or
 * delete the reported content directly.
 */
export function ReportsManager({ adminProfileId }: ReportsManagerProps) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "dismissed">("open");

  const fetchReports = async (status = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/forum/reports?status=${status}&adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const handleStatus = async (reportId: number, status: "resolved" | "dismissed") => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/forum/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminProfileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update report");
      setSuccess(status === "resolved" ? "Report resolved." : "Report dismissed.");
      await fetchReports();
    } catch (err: any) {
      setError(err.message || "Failed to update report");
    }
  };

  const handleDeleteTarget = async (targetType: "thread" | "reply", targetId: number) => {
    if (!window.confirm(`Delete the reported ${targetType} #${targetId}? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        targetType === "thread"
          ? `/api/forum/threads/${targetId}?requesterId=${adminProfileId}`
          : `/api/forum/replies/${targetId}?requesterId=${adminProfileId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete target");
      setSuccess(`Reported ${targetType} deleted.`);
      await fetchReports();
    } catch (err: any) {
      setError(err.message || "Failed to delete target");
    }
  };

  const openCount = reports.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center">
          <Flag className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Community Reports</h2>
          <p className="text-xs text-slate-500">
            {openCount} open report{openCount === 1 ? "" : "s"} — shown to admins as notifications
          </p>
        </div>
        <button
          onClick={() => fetchReports()}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(["open", "resolved", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              fetchReports(s);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
              statusFilter === s
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s} ({s === "open" ? openCount : ""})
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center">
          <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">No {statusFilter} reports</p>
          <p className="text-xs text-slate-400 mt-1">
            New reports from the community appear here and in the admins&apos; notification bell.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border bg-white p-4 shadow-xs ${
                r.status === "open" ? "border-red-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    r.status === "open" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {r.status}
                  </span>
                  <span className="font-bold text-slate-700">
                    {r.targetType === "thread" ? "Thread" : "Reply"} #{r.targetId}
                  </span>
                  <span>· by {r.reporterName || `#${r.reporterId}`}</span>
                  <span>· {new Date(r.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-slate-700 mt-2 bg-red-50/60 border border-red-100 rounded-lg px-3 py-2">
                “{r.reason}”
              </p>
              {r.status === "open" && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleDeleteTarget(r.targetType, r.targetId)}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" /> Delete {r.targetType}
                  </button>
                  <button
                    onClick={() => handleStatus(r.id, "resolved")}
                    className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Resolve
                  </button>
                  <button
                    onClick={() => handleStatus(r.id, "dismissed")}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <XCircle className="h-3 w-3" /> Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
