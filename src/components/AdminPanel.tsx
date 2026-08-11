"use client";

import React, { useState } from "react";
import { ShieldCheck, Building2, Video, Award, Gift } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { UniversitiesManager } from "./admin/UniversitiesManager";
import { CoursesManager } from "./admin/CoursesManager";
import { ScholarshipsManager } from "./admin/ScholarshipsManager";
import { PremiumManager } from "./admin/PremiumManager";

interface AdminPanelProps {
  activeProfile: StudentProfile | null;
}

type AdminTab = "universities" | "courses" | "scholarships" | "premium";

export function AdminPanel({ activeProfile }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>("universities");

  if (!activeProfile) {
    return <p className="text-sm text-slate-500 p-6">Select a profile to manage the site.</p>;
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "universities", label: "Universities", icon: <Building2 className="h-4 w-4" /> },
    { id: "courses", label: "Courses & Videos", icon: <Video className="h-4 w-4" /> },
    { id: "scholarships", label: "Scholarships", icon: <Award className="h-4 w-4" /> },
    { id: "premium", label: "Premium Gifts", icon: <Gift className="h-4 w-4" /> },
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
            <p className="text-xs text-slate-300 mt-0.5">Manage universities, courses/videos, scholarships &amp; premium access.</p>
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

      {tab === "universities" && <UniversitiesManager adminProfileId={activeProfile.id} />}
      {tab === "courses" && <CoursesManager adminProfileId={activeProfile.id} />}
      {tab === "scholarships" && <ScholarshipsManager adminProfileId={activeProfile.id} />}
      {tab === "premium" && <PremiumManager adminProfileId={activeProfile.id} />}
    </div>
  );
}
