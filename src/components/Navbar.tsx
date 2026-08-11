"use client";

import React from "react";
import { 
  GraduationCap, 
  Search, 
  Award, 
  CheckSquare, 
  FileText, 
  Bot, 
  User, 
  Plus, 
  Sparkles,
  LayoutDashboard,
  MessagesSquare,
  Video,
  Crown,
  Gift,
  Trophy
} from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export interface StudentProfile {
  id: number;
  name: string;
  email: string;
  degreeLevel: string;
  targetMajor: string;
  gpa: number;
  gpaScale: number;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  greScore?: number | null;
  budgetAnnualUsd: number;
  preferredCountries: string;
  needScholarship: boolean;
  extracurriculars?: string | null;
  workExperienceYears?: number | null;
  researchPublications?: number | null;
  preferredLocale?: string;
  isAdmin?: boolean;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profiles: StudentProfile[];
  activeProfile: StudentProfile | null;
  setActiveProfile: (profile: StudentProfile) => void;
  onOpenProfileModal: (isNew?: boolean) => void;
  onLocaleChange?: (locale: string) => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  profiles,
  activeProfile,
  setActiveProfile,
  onOpenProfileModal,
  onLocaleChange,
}: NavbarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard & Audit", icon: LayoutDashboard },
    { id: "universities", label: "University Explorer", icon: Search },
    { id: "scholarships", label: "Scholarship Hub", icon: Award },
    { id: "tracker", label: "My Applications", icon: GraduationCap },
    { id: "sop", label: "AI SOP & Essays", icon: FileText, premium: true },
    { id: "tasks", label: "Tasks & Roadmap", icon: CheckSquare, premium: true },
    { id: "chat", label: "AI Mentor", icon: Bot },
    { id: "forum", label: "Community Forum", icon: MessagesSquare, premium: true },
    { id: "courses", label: "Courses", icon: Video, premium: true },
    { id: "payments", label: "Premium", icon: Crown },
    { id: "rewards", label: "Rewards & Referrals", icon: Gift },
  ];

  // Admin sees an extra management tab.
  const isAdmin = !!activeProfile?.isAdmin;
  const displayItems = isAdmin
    ? [...navItems, { id: "admin", label: "Admin Panel", icon: Crown }]
    : navItems;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-md shadow-indigo-200 border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png"
                alt="ScholarBridge Logo"
                className="h-10 w-10 object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-slate-900">ScholarBridge</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Sparkles className="h-3 w-3 text-indigo-600" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">Global Admissions & Scholarship Discovery</p>
            </div>
          </div>

          {/* Language switcher, Active Profile Switcher & Edit */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher onLocaleChange={onLocaleChange} />
            <div className="relative flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <User className="h-4 w-4 text-slate-500 ml-2" />
              <select
                value={activeProfile?.id || ""}
                onChange={(e) => {
                  const p = profiles.find((item) => item.id === Number(e.target.value));
                  if (p) setActiveProfile(p);
                }}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 py-1 pl-1 pr-6 focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.targetMajor})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => onOpenProfileModal(false)}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-colors"
              title="Edit Active Profile"
            >
              Edit Profile
            </button>

            <button
              onClick={() => onOpenProfileModal(true)}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Add New Profile"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 sm:space-x-2 py-2 no-scrollbar border-t border-slate-100">
          {displayItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            // Premium items are styled gold; admin is dark; others default indigo.
            const premium = (item as { premium?: boolean }).premium;
            const isAdminTab = item.id === "admin";
            const activeCls = isActive
              ? premium
                ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-xs font-bold"
                : isAdminTab
                ? "bg-slate-900 text-white shadow-xs font-bold"
                : "bg-indigo-600 text-white shadow-xs font-semibold"
              : premium
              ? "text-amber-700 hover:bg-amber-50 hover:text-amber-800 border border-amber-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100";
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${activeCls}`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "" : premium ? "text-amber-500" : "text-slate-500"}`} />
                {item.label}
                {premium && !isActive && (
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
