"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { ShieldCheck, Building2, Video, Award, Gift, History, Settings2, RefreshCw, BadgeCheck, Headset, Bot, BarChart3, Flag } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { UniversitiesManager } from "./admin/UniversitiesManager";
import { CoursesManager } from "./admin/CoursesManager";
import { ScholarshipsManager } from "./admin/ScholarshipsManager";
import { PremiumManager } from "./admin/PremiumManager";
import { AuditLogViewer } from "./admin/AuditLogViewer";
import { ConfigManager } from "./admin/ConfigManager";
import { RefreshCenter } from "./admin/RefreshCenter";
import { VerificationManager } from "./admin/VerificationManager";
import { ConsultingManager } from "./admin/ConsultingManager";
import { AnalyticsDashboard } from "./admin/AnalyticsDashboard";
import { ReportsManager } from "./admin/ReportsManager";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * Research Agent is lazy-loaded so that any issue in its client bundle can
 * never crash the Admin Panel. It also never auto-runs on mount — the user
 * must explicitly click RUN.
 */
const ResearchAgent = dynamic(
  () => import("./admin/ResearchAgent").then((m) => m.ResearchAgent),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
        Loading Research Agent…
      </div>
    ),
  }
);

interface AdminPanelProps {
  activeProfile: StudentProfile | null;
}

type AdminTab = "analytics" | "universities" | "courses" | "scholarships" | "premium" | "audit" | "refresh" | "config" | "verify" | "consulting" | "reports" | "research";

export function AdminPanel({ activeProfile }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>("universities");

  if (!activeProfile) {
    return <p className="text-sm text-slate-500 p-6">Select a profile to manage the site.</p>;
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "universities", label: "Universities", icon: <Building2 className="h-4 w-4" /> },
    { id: "courses", label: "Courses & Videos", icon: <Video className="h-4 w-4" /> },
    { id: "scholarships", label: "Scholarships", icon: <Award className="h-4 w-4" /> },
    { id: "premium", label: "Premium Gifts", icon: <Gift className="h-4 w-4" /> },
    { id: "audit", label: "Audit Log", icon: <History className="h-4 w-4" /> },
    { id: "verify", label: "Verification", icon: <BadgeCheck className="h-4 w-4" /> },
    { id: "reports", label: "Reports", icon: <Flag className="h-4 w-4" /> },
    { id: "consulting", label: "Consulting", icon: <Headset className="h-4 w-4" /> },
    { id: "research", label: "Research Agent", icon: <Bot className="h-4 w-4" /> },
    { id: "refresh", label: "Data Refresh", icon: <RefreshCw className="h-4 w-4" /> },
    { id: "config", label: "Settings", icon: <Settings2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold">Admin Panel</h1>
            <p className="text-xs text-slate-300 mt-0.5">Manage universities, courses/videos, scholarships, premium access &amp; data operations.</p>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              tab === t.id ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Each tab is wrapped in an ErrorBoundary so a failing tab can never
          crash the whole Admin Panel. */}
      {tab === "analytics" && (
        <ErrorBoundary><AnalyticsDashboard adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "universities" && (
        <ErrorBoundary><UniversitiesManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "courses" && (
        <ErrorBoundary><CoursesManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "scholarships" && (
        <ErrorBoundary><ScholarshipsManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "premium" && (
        <ErrorBoundary><PremiumManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "audit" && (
        <ErrorBoundary><AuditLogViewer adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "refresh" && (
        <ErrorBoundary><RefreshCenter adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "config" && (
        <ErrorBoundary><ConfigManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "verify" && (
        <ErrorBoundary><VerificationManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "reports" && (
        <ErrorBoundary><ReportsManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "consulting" && (
        <ErrorBoundary><ConsultingManager adminProfileId={activeProfile.id} /></ErrorBoundary>
      )}
      {tab === "research" && (
        <ErrorBoundary
          fallback={
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-xs font-bold text-amber-800">Research Agent unavailable</p>
              <p className="text-[11px] text-amber-600 mt-1">
                The research agent failed to load. Other admin sections are unaffected.
              </p>
            </div>
          }
        >
          <ResearchAgent adminProfileId={activeProfile.id} />
        </ErrorBoundary>
      )}
    </div>
  );
}
