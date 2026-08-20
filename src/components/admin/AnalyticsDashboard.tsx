"use client";

import React, { useEffect, useState } from "react";
import { Users, UserPlus, Crown, Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface AnalyticsDashboardProps {
  adminProfileId: number;
}

interface AnalyticsData {
  totalUsers: number;
  newUsersThisMonth: number;
  activeSubscribers: number;
  generatedAt?: string;
}

/**
 * Admin analytics dashboard — real-time usage metrics.
 * Same visual style as the rest of the admin panel (rounded-2xl cards,
 * slate/indigo palette, text-xs labels).
 */
export function AnalyticsDashboard({ adminProfileId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?adminProfileId=${adminProfileId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Same fetch-on-mount pattern as the other admin managers (initial data load).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const cards: { label: string; value: number | null; icon: React.ReactNode; accent: string }[] = [
    {
      label: "Total Users",
      value: data?.totalUsers ?? null,
      icon: <Users className="h-5 w-5" />,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "New Users (This Month)",
      value: data?.newUsersThisMonth ?? null,
      icon: <UserPlus className="h-5 w-5" />,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Active Paid Subscribers",
      value: data?.activeSubscribers ?? null,
      icon: <Crown className="h-5 w-5" />,
      accent: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Users className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Usage Analytics</h2>
          <p className="text-xs text-slate-500">Real-time platform metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className={`h-10 w-10 rounded-xl ${c.accent} flex items-center justify-center mb-3`}>
                {c.icon}
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {c.value != null ? c.value.toLocaleString() : "—"}
              </p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {data?.generatedAt && (
        <p className="text-[10px] text-slate-400">
          Generated at {new Date(data.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
