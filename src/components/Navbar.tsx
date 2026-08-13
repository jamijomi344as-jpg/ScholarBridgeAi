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
  Trophy,
  ShieldCheck,
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
  // Referral system v2
  referralCode?: string | null;
  referredBy?: number | null;
  referralPoints?: number | null;
  isPremium?: boolean | null;
  premiumUntil?: string | null;
  referralRewarded?: boolean | null;
  // Onboarding wizard
  onboardingStep?: number | null;
  onboardingCompleted?: boolean | null;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeProfile: StudentProfile | null;
  onOpenProfileModal: (isNew?: boolean) => void;
  onSwitchProfile?: () => void;
  onStartOnboarding?: () => void;
  onLocaleChange?: (locale: string) => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  activeProfile,
  onOpenProfileModal,
  onSwitchProfile,
  onStartOnboarding,
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

  const Logo = (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-md shadow-indigo-200 border border-slate-200 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png"
          alt="ScholarBridge Logo"
          className="h-9 w-9 object-cover"
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-lg tracking-tight text-slate-900 truncate">ScholarBridge</span>
          <span className="hidden xl:inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles className="h-2.5 w-2.5 text-indigo-600" /> Gemini AI
          </span>
        </div>
        <p className="text-[10px] text-slate-500 truncate hidden sm:block">Global Admissions & Scholarship Discovery</p>
      </div>
    </div>
  );

  // Shows ONLY the currently signed-in profile (no list of other users).
  // Switching happens via the dedicated profile picker (onSwitchProfile).
  const ProfileChip = (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200 min-w-0 flex-1"
        title={activeProfile?.email}
      >
        <User className="h-4 w-4 text-slate-500 shrink-0" />
        <span className="truncate text-xs font-semibold text-slate-800">
          {activeProfile?.name || "No profile"}
        </span>
        {isAdmin && (
          <ShieldCheck className="h-3.5 w-3.5 text-slate-700 shrink-0" />
        )}
      </div>
      {onSwitchProfile && (
        <button
          onClick={onSwitchProfile}
          className="shrink-0 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg border border-indigo-200 transition-colors"
          title="Sign in / switch account"
        >
          {activeProfile ? "Switch" : "Sign in"}
        </button>
      )}
    </div>
  );

  const renderNav = (vertical: boolean) => (
    <>
      {displayItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
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
            title={item.label}
            className={`flex items-center gap-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
              vertical
                ? "w-full px-3 py-2.5 text-left"
                : "px-3 py-2"
            } ${activeCls}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? "" : premium ? "text-amber-500" : "text-slate-500"}`} />
            <span className={vertical ? "flex-1 truncate" : ""}>{item.label}</span>
            {premium && !isActive && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Pro
              </span>
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <>
      {/* ================= DESKTOP: LEFT SIDEBAR ================= */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen z-40">
        {/* Logo */}
        <div
          className="px-5 py-5 border-b border-slate-100 cursor-pointer"
          onClick={() => setActiveTab("dashboard")}
        >
          {Logo}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar">
          {renderNav(true)}
        </nav>

        {/* Bottom: profile switcher + actions */}
        <div className="px-4 py-4 border-t border-slate-100 space-y-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Student profile</p>
          {ProfileChip}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenProfileModal(false)}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-2 rounded-lg border border-indigo-200 transition-colors"
            >
              Edit Profile
            </button>
            <button
              onClick={onStartOnboarding ?? (() => onOpenProfileModal(true))}
              className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 px-2.5 py-2 rounded-lg border border-slate-200 transition-colors"
              title="Add New Profile"
            >
              <Plus className="h-3 w-3" /> Add New
            </button>
          </div>
          <div className="pt-1">
            <LanguageSwitcher onLocaleChange={onLocaleChange} />
          </div>
        </div>
      </aside>

      {/* ================= MOBILE: TOP HEADER + HORIZONTAL TABS ================= */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            {Logo}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="max-w-[180px] flex-1">{ProfileChip}</div>
              <button
                onClick={() => onOpenProfileModal(false)}
                className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg border border-indigo-200 shrink-0"
              >
                Edit
              </button>
              <button
                onClick={onStartOnboarding ?? (() => onOpenProfileModal(true))}
                className="p-1.5 text-slate-600 hover:text-indigo-600 bg-slate-100 rounded-lg shrink-0"
                title="Add New Profile"
              >
                <Plus className="h-4 w-4" />
              </button>
              <LanguageSwitcher onLocaleChange={onLocaleChange} />
            </div>
          </div>
        </div>
        {/* Navigation Tabs (horizontal scroll) */}
        <div className="flex overflow-x-auto space-x-1 sm:space-x-2 py-2 px-4 no-scrollbar border-t border-slate-100">
          {renderNav(false)}
        </div>
      </header>
    </>
  );
}
