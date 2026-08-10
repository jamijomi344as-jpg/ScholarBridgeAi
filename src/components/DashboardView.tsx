"use client";

import React, { useState } from "react";
import { StudentProfile } from "./Navbar";
import { 
  Sparkles, 
  Search, 
  Award, 
  GraduationCap, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Compass, 
  Bot, 
  ArrowRight,
  ShieldCheck,
  Zap,
  BookOpen
} from "lucide-react";

interface DashboardViewProps {
  profile: StudentProfile | null;
  onNavigateTab: (tab: string) => void;
  savedUniCount: number;
  savedScholarshipCount: number;
  taskCount: number;
  onEditProfile: () => void;
}

export function DashboardView({
  profile,
  onNavigateTab,
  savedUniCount,
  savedScholarshipCount,
  taskCount,
  onEditProfile,
}: DashboardViewProps) {
  const [aiEvaluation, setAiEvaluation] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-slate-600 font-medium">No profile selected. Please select or create a profile above.</p>
      </div>
    );
  }

  const runAiAudit = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch("/api/ai/evaluate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });
      const data = await res.json();
      if (data.evaluation) {
        setAiEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Calculate quick score estimate
  const normGpa = (profile.gpa / profile.gpaScale) * 4.0;
  const gpaPercent = Math.round((normGpa / 4.0) * 100);
  const compositeScore = Math.min(
    96,
    Math.max(
      65,
      Math.round(
        gpaPercent * 0.5 +
          ((profile.ieltsScore || 6.5) / 9) * 25 +
          ((profile.workExperienceYears || 0) > 0 ? 10 : 5) +
          ((profile.researchPublications || 0) > 0 ? 10 : 5)
      )
    )
  );

  let preferredCountriesList: string[] = ["United States", "United Kingdom", "Canada"];
  try {
    if (typeof profile.preferredCountries === "string") {
      preferredCountriesList = JSON.parse(profile.preferredCountries);
    } else if (Array.isArray(profile.preferredCountries)) {
      preferredCountriesList = profile.preferredCountries;
    }
  } catch {
    // fallback
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 border border-white/10 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Active Applicant: {profile.name}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Global Admissions & Scholarship Discovery Hub
            </h1>
            
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Matching your academic credentials (**GPA {profile.gpa}/{profile.gpaScale}**, {profile.ieltsScore ? `IELTS ${profile.ieltsScore}` : "Test Prep Active"}) for **{profile.degreeLevel} in {profile.targetMajor}** across top universities in {preferredCountriesList.slice(0, 3).join(", ")}.
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-white/10">
                🎓 Level: <strong className="text-white">{profile.degreeLevel}</strong>
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-white/10">
                💰 Budget Limit: <strong className="text-emerald-300">${profile.budgetAnnualUsd?.toLocaleString()}/yr</strong>
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-white/10">
                🏆 Pubs/Work: <strong className="text-amber-300">{profile.researchPublications || 0} Pubs • {profile.workExperienceYears || 0} yrs Exp</strong>
              </span>
            </div>
          </div>

          {/* Readiness Score Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-center flex flex-col items-center justify-center space-y-3">
            <div className="text-xs font-semibold tracking-wider text-indigo-200 uppercase">
              Admissions Index
            </div>

            <div className="relative flex items-center justify-center">
              <div className="h-24 w-24 rounded-full border-4 border-indigo-400/30 flex items-center justify-center bg-indigo-900/40 shadow-inner">
                <span className="text-3xl font-extrabold text-amber-300">{compositeScore}</span>
                <span className="text-xs text-slate-300 font-semibold">%</span>
              </div>
            </div>

            <div className="text-xs text-indigo-100 font-medium">
              Competitive Global Tier
            </div>

            <button
              onClick={runAiAudit}
              disabled={isEvaluating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Bot className="h-4 w-4" />
              {isEvaluating ? "Analyzing Profile..." : "Run Gemini AI Audit"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab("tracker")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Shortlisted Programs</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{savedUniCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Universities in tracker</p>
        </div>

        <div 
          onClick={() => onNavigateTab("scholarships")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Scholarships Tracked</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{savedScholarshipCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Saved aid programs</p>
        </div>

        <div 
          onClick={() => onNavigateTab("tasks")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Pending Milestones</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{taskCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Application tasks pending</p>
        </div>

        <div 
          onClick={() => onNavigateTab("sop")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">AI SOP & Review Studio</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">Ready</div>
          <p className="text-[11px] text-slate-500 mt-1">Draft or evaluate essay</p>
        </div>
      </div>

      {/* Gemini AI Evaluation Report Output Modal/Card */}
      {aiEvaluation && (
        <div className="bg-white rounded-2xl p-6 border-2 border-indigo-200 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
              <Bot className="h-5 w-5" />
              ScholarBridge Gemini AI Strategic Evaluation
            </div>
            <button
              onClick={() => setAiEvaluation(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Close Report
            </button>
          </div>

          <div className="prose prose-indigo max-w-none text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {aiEvaluation}
          </div>
        </div>
      )}

      {/* Main Grid: Recommended Actions & Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Strategic Breakdown & Recommended Programs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-600" />
                University Portfolio Strategy (3-2-1 Rule)
              </h2>
              <button
                onClick={() => onNavigateTab("universities")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Explore All <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Admissions counselors recommend building a balanced portfolio across Reach, Match, and Safety tiers:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-purple-700 uppercase">🚀 Reach (20-30%)</span>
                <div className="text-sm font-bold text-purple-900">MIT, Oxford, ETH Zurich</div>
                <p className="text-[11px] text-purple-700">Aspirational top-10 world institutions.</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase">🎯 Match (50-60%)</span>
                <div className="text-sm font-bold text-blue-900">TUM, U of Toronto, NUS</div>
                <p className="text-[11px] text-blue-700">Highest statistical acceptance likelihood.</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">🛡️ Safety (10-20%)</span>
                <div className="text-sm font-bold text-emerald-900">U of Melbourne, UBC</div>
                <p className="text-[11px] text-emerald-700">Guaranteed admission & funding backups.</p>
              </div>
            </div>
          </div>

          {/* Key Quick Launcher Tools */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => onNavigateTab("sop")}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-md hover:shadow-lg cursor-pointer transition-all space-y-3"
            >
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">Statement of Purpose Generator</h3>
                <p className="text-xs text-indigo-100 mt-1">Draft a university-specific SOP tailored to your GPA, research, and career goals in seconds.</p>
              </div>
              <div className="text-xs font-bold inline-flex items-center gap-1 text-amber-300">
                Launch SOP Studio <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            <div 
              onClick={() => onNavigateTab("chat")}
              className="bg-gradient-to-br from-slate-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md hover:shadow-lg cursor-pointer transition-all space-y-3"
            >
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-base">ScholarBridge AI Chat Mentor</h3>
                <p className="text-xs text-slate-300 mt-1">Ask any questions regarding visas (OPT, PGWP, Job Seeker), GRE waivers, or cost of living.</p>
              </div>
              <div className="text-xs font-bold inline-flex items-center gap-1 text-amber-300">
                Open AI Chat <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Academic Checklist & Budget Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Profile Health Checklist
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">Academic Transcript GPA</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {profile.gpa} / {profile.gpaScale}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">Language Proficiency</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  {profile.ieltsScore ? `IELTS ${profile.ieltsScore}` : profile.toeflScore ? `TOEFL ${profile.toeflScore}` : "Pending"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">Annual Tuition Budget</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  ${profile.budgetAnnualUsd?.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">Publications & Experience</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                  {profile.researchPublications || 0} Pubs • {profile.workExperienceYears || 0} yrs
                </span>
              </div>
            </div>

            <button
              onClick={onEditProfile}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Update Credentials
            </button>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Scholarship Match Guarantee
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Based on your budget constraint of **${profile.budgetAnnualUsd?.toLocaleString()}/yr**, you have 8+ fully and partially funded scholarship matches available!
            </p>
            <button
              onClick={() => onNavigateTab("scholarships")}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
            >
              View Eligible Scholarships
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
