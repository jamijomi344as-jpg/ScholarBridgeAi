"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Trash2, CheckCircle2, XCircle } from "lucide-react";

export interface ForumReportItem {
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

interface ForumModerationPanelProps {
  reports: ForumReportItem[];
  onResolve: (id: number) => void;
  onDismiss: (id: number) => void;
  onDeleteTarget: (targetType: "thread" | "reply", targetId: number) => void;
}

export function ForumModerationPanel({ reports, onResolve, onDismiss, onDeleteTarget }: ForumModerationPanelProps) {
  const t = useTranslations("forum");

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 text-center">
        <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">{t("moderation")}</p>
        <p className="text-xs text-slate-400 mt-1">{t("noThreads")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
      <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
        <ShieldCheck className="h-5 w-5 text-indigo-600" />
        {t("moderation")} · {t("openReports")} ({reports.length})
      </div>

      {reports.map((report) => (
        <div key={report.id} className="border border-amber-200 bg-amber-50/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] text-slate-500">
              <span className="font-bold text-slate-700">{report.reporterName || `#${report.reporterId}`}</span>
              {" "}→ {report.targetType} #{report.targetId}
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {t("reportStatusOpen")}
            </span>
          </div>
          <p className="text-xs text-slate-700">{`\u201C${report.reason}\u201D`}</p>
          <p className="text-[10px] text-slate-400">{new Date(report.createdAt).toLocaleString()}</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onDeleteTarget(report.targetType, report.targetId)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
            </button>
            <button
              onClick={() => onResolve(report.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("resolveReport")}
            </button>
            <button
              onClick={() => onDismiss(report.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
            >
              <XCircle className="h-3.5 w-3.5" /> {t("reportStatusDismissed")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
