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
  LogOut,
  CalendarClock,
  Headset,
} from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";

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
  activeProfileId?: number | null;
  onOpenProfileModal: (isNew?: boolean) => void;
  onSwitchProfile?: () => void;
  onStartOnboarding?: () => void;
  onLogout?: () => void;
  onLocaleChange?: (locale: string) => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  activeProfile,
  activeProfileId,
  onOpenProfileModal,
  onSwitchProfile,
  onStartOnboarding,
  onLogout,
  onLocaleChange,
}: NavbarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard & Audit", icon: LayoutDashboard },
    { id: "universities", label: "University Explorer", icon: Search },
    { id: "scholarships", label: "Scholarship Hub", icon: Award },
    { id: "tracker", label: "My Applications", icon: GraduationCap },
    // Hidden until ready: code kept, UI hidden (feature not yet live).
    { id: "deadlines", label: "Deadlines", icon: CalendarClock, premium: true, hidden: true },
    { id: "sop", label: "AI SOP & Essays", icon: FileText, premium: true },
    { id: "tasks", label: "Tasks & Roadmap", icon: CheckSquare, premium: true },
    { id: "chat", label: "AI Mentor", icon: Bot },
    { id: "forum", label: "Community Forum", icon: MessagesSquare, premium: true },
    // Hidden until ready: code kept, UI hidden (feature not yet live).
    { id: "courses", label: "Courses", icon: Video, premium: true, hidden: true },
    { id: "payments", label: "Premium", icon: Crown },
    { id: "rewards", label: "Rewards & Referrals", icon: Gift },
    // Hidden until ready: code kept, UI hidden (feature not yet live).
    { id: "consulting", label: "Consulting", icon: Headset, hidden: true },
  ];

  // Admin sees an extra management tab. Hidden items stay in the code but are
  // never rendered (feature not ready — no dead navigation).
  const isAdmin = !!activeProfile?.isAdmin;
  const visibleItems = navItems.filter((item) => !item.hidden);
  const displayItems = isAdmin
    ? [...visibleItems, { id: "admin", label: "Admin Panel", icon: Crown }]
    : visibleItems;

  const Logo = (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-md shadow-indigo-200 border border-slate-200 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/Gemini_Generated_Image_wpswjzwpswjzwpsw.jpg"
          alt="ScholarBridge Logo"
          className="h-9 w-9 object-cover"
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-lg tracking-tight text-slate-900 truncate">ScholarBridge</span>
          <span className="hidden xl:inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles className="h-2.5 w-2.5 text-indigo-600" /> AI
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">{ProfileChip}</div>
            <NotificationBell profileId={activeProfileId ?? null} />
          </div>
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
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-2 rounded-lg border border-red-200 transition-colors"
            >
              <LogOut className="h-3 w-3" /> Chiqish (Logout)
            </button>
          )}
          <div className="pt-1">
            <LanguageSwitcher onLocaleChange={onLocaleChange} />
          </div>
        </div>
      </aside>

      {/* ================= MOBILE: TOP HEADER ================= */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="px-3 sm:px-4">
          {/* Row 1: logo + actions */}
          <div className="flex items-center justify-between h-14 gap-2">
            <button className="flex items-center gap-2 min-w-0" onClick={() => setActiveTab("dashboard")}>
              <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-sm border border-slate-200 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png"
                  alt="ScholarBridge Logo"
                  className="h-8 w-8 object-cover"
                />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 truncate">
                ScholarBridge
              </span>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <NotificationBell profileId={activeProfileId ?? null} />
              <LanguageSwitcher onLocaleChange={onLocaleChange} />
              <button
                onClick={onSwitchProfile}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-2 rounded-lg border border-indigo-200"
                title="Sign in / switch account"
              >
                <User className="h-3 w-3" />
                {activeProfile ? "Switch" : "Sign in"}
              </button>
              <button
                onClick={onStartOnboarding ?? (() => onOpenProfileModal(true))}
                className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                title="Add New Profile"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Row 2: active profile chip (compact) */}
          {activeProfile && (
            <div className="flex items-center gap-2 pb-2 -mt-0.5">
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200 min-w-0">
                <User className="h-3 w-3 text-slate-500 shrink-0" />
                <span className="truncate text-[11px] font-semibold text-slate-800">
                  {activeProfile.name}
                </span>
                {isAdmin && <ShieldCheck className="h-3 w-3 text-slate-700 shrink-0" />}
              </div>
              <button
                onClick={() => onOpenProfileModal(false)}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg border border-indigo-200 shrink-0"
              >
                Edit
              </button>
            </div>
          )}
        </div>
        {/* Navigation Tabs (horizontal scroll) */}
        <div className="flex overflow-x-auto space-x-1 py-2 px-3 sm:px-4 no-scrollbar border-t border-slate-100">
          {renderNav(false)}
        </div>
      </header>
    </>
  );
}
