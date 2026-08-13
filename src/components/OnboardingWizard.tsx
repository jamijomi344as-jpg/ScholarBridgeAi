"use client";

import React, { useState } from "react";
import {
  User,
  GraduationCap,
  Compass,
  BookOpen,
  FileCheck,
  Wallet,
  Globe2,
  Trophy,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { StudentProfile } from "./Navbar";

interface OnboardingWizardProps {
  /**
   * Existing profile (resume mode) OR null for a brand-new visitor:
   * in that case step 1 (name + email) creates the profile via POST /api/profiles,
   * and every following step saves through PUT /api/profiles/:id.
   */
  profile: StudentProfile | null;
  onCreated?: (profile: StudentProfile) => void;
  onComplete: (updated: StudentProfile) => void;
}

interface FormState {
  name: string;
  email: string;
  degreeLevel: string;
  targetMajor: string;
  gpa: string;
  gpaScale: string;
  ieltsScore: string;
  toeflScore: string;
  satScore: string;
  greScore: string;
  budgetAnnualUsd: string;
  needScholarship: boolean;
  preferredCountries: string[];
  workExperienceYears: string;
  researchPublications: string;
  extracurriculars: string;
}

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "Australia",
  "Singapore",
  "Netherlands",
  "Switzerland",
  "Japan",
  "France",
  "Sweden",
  "South Korea",
  "United Arab Emirates",
  "China",
];

const DEGREES = ["Bachelor", "Master", "PhD"];

const STEPS = [
  { id: 0, title: "Name & Email", icon: User },
  { id: 1, title: "Target Degree", icon: GraduationCap },
  { id: 2, title: "Target Major", icon: Compass },
  { id: 3, title: "Academic Performance", icon: BookOpen },
  { id: 4, title: "Standard Tests", icon: FileCheck },
  { id: 5, title: "Budget & Financial Aid", icon: Wallet },
  { id: 6, title: "Preferred Countries", icon: Globe2 },
  { id: 7, title: "Experience & Achievements", icon: Trophy },
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow";
const labelCls = "block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5";

export function OnboardingWizard({ profile, onCreated, onComplete }: OnboardingWizardProps) {
  // Resume: continue from the saved step (0-based), defaulting to step 0.
  const startStep = profile
    ? Math.min(Math.max(profile.onboardingStep ?? 0, 0), 7)
    : 0;

  const [step, setStep] = useState<number>(startStep);
  const [createdId, setCreatedId] = useState<number | null>(profile?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    name: profile?.name || "",
    email: profile?.email || "",
    degreeLevel: profile?.degreeLevel || "",
    targetMajor: profile?.targetMajor === "Computer Science" ? "" : profile?.targetMajor || "",
    gpa: profile?.gpa ? String(profile.gpa) : "",
    gpaScale: profile?.gpaScale ? String(profile.gpaScale) : "",
    ieltsScore: profile?.ieltsScore ? String(profile.ieltsScore) : "",
    toeflScore: profile?.toeflScore ? String(profile.toeflScore) : "",
    satScore: profile?.satScore ? String(profile.satScore) : "",
    greScore: profile?.greScore ? String(profile.greScore) : "",
    budgetAnnualUsd: profile?.budgetAnnualUsd ? String(profile.budgetAnnualUsd) : "",
    needScholarship: profile?.needScholarship ?? true,
    preferredCountries: safeParseCountries(profile?.preferredCountries),
    workExperienceYears: profile?.workExperienceYears != null ? String(profile.workExperienceYears) : "",
    researchPublications: profile?.researchPublications != null ? String(profile.researchPublications) : "",
    extracurriculars: profile?.extracurriculars || "",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const storedReferralCode = (): string | null => {
    try {
      const raw = localStorage.getItem("scholarbridge_ref");
      if (!raw) return null;
      const { code, at } = JSON.parse(raw);
      if (!code || !at || Date.now() - at > 48 * 60 * 60 * 1000) {
        localStorage.removeItem("scholarbridge_ref");
        return null;
      }
      return code;
    } catch {
      return null;
    }
  };

  /**
   * Persist the current step. For a brand-new visitor the very first save
   * creates the profile (POST /api/profiles with name/email + referral code),
   * afterwards every step uses PUT /api/profiles/:id. Each save advances
   * onboardingStep so the user can leave and resume later.
   */
  const persist = async (nextStep: number, completed: boolean) => {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        degreeLevel: form.degreeLevel || "Master",
        targetMajor: form.targetMajor || "Computer Science",
        gpa: form.gpa ? Number(form.gpa) : 3.5,
        gpaScale: form.gpaScale ? Number(form.gpaScale) : 4.0,
        ieltsScore: form.ieltsScore ? Number(form.ieltsScore) : null,
        toeflScore: form.toeflScore ? Number(form.toeflScore) : null,
        satScore: form.satScore ? Number(form.satScore) : null,
        greScore: form.greScore ? Number(form.greScore) : null,
        budgetAnnualUsd: form.budgetAnnualUsd ? Number(form.budgetAnnualUsd) : 25000,
        needScholarship: form.needScholarship,
        preferredCountries: form.preferredCountries.length
          ? form.preferredCountries
          : ["United States", "United Kingdom", "Canada", "Germany"],
        workExperienceYears: form.workExperienceYears ? Number(form.workExperienceYears) : 0,
        researchPublications: form.researchPublications ? Number(form.researchPublications) : 0,
        extracurriculars: form.extracurriculars || "",
        onboardingStep: nextStep,
        onboardingCompleted: completed,
      };

      if (createdId == null) {
        // Step 1: create the profile (name + email are mandatory here).
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, referralCode: storedReferralCode() }),
        });
        const data = await res.json();
        if (!res.ok || !data.profile) {
          throw new Error(data.error || "Could not create profile");
        }
        const created = data.profile as StudentProfile;
        setCreatedId(created.id);
        onCreated?.(created);
        return created;
      }

      const res = await fetch(`/api/profiles/${createdId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) throw new Error(data.error || "Could not save profile");
      return data.profile as StudentProfile;
    } catch (err: any) {
      setError(err.message || "Something went wrong while saving");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 0 && (!form.name.trim() || !form.email.trim())) {
      setError("Full name and email are required");
      return;
    }
    if (step === STEPS.length - 1) {
      const updated = await persist(8, true);
      if (updated) {
        setFinished(true);
        onComplete(updated);
      }
      return;
    }
    const updated = await persist(step + 1, false);
    if (updated) setStep((s) => s + 1);
  };

  const handleSkip = async () => {
    if (step === STEPS.length - 1) {
      const updated = await persist(8, true);
      if (updated) {
        setFinished(true);
        onComplete(updated);
      }
      return;
    }
    const updated = await persist(step + 1, false);
    if (updated) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const toggleCountry = (c: string) =>
    set(
      "preferredCountries",
      form.preferredCountries.includes(c)
        ? form.preferredCountries.filter((x) => x !== c)
        : [...form.preferredCountries, c]
    );

  // ---------------- Done screen ----------------
  if (finished) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center space-y-5">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Your profile is ready! 🎉</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            ScholarBridge can now match you with universities and grants that fit
            your GPA, test scores and budget. Let&apos;s go to your dashboard!
          </p>
          <button
            onClick={() => onComplete(profile ?? ({} as StudentProfile))}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-md hover:from-indigo-700 hover:to-violet-700 transition-all"
          >
            <Sparkles className="h-4 w-4" /> Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stepInfo = STEPS[step];
  const StepIcon = stepInfo.icon;
  const progressPct = Math.round((step / (STEPS.length - 1)) * 100);
  const isLast = step === STEPS.length - 1;
  const nextDisabled =
    saving || (step === 0 && (!form.name.trim() || !form.email.trim()));

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {createdId == null ? "Create your account" : "Complete your profile"}
          </p>
          <p className="text-xs font-extrabold text-indigo-600">
            Step {step + 1} / {STEPS.length}
          </p>
        </div>
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(progressPct, 8)}%` }}
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <StepIcon className="h-4 w-4" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{stepInfo.title}</h2>
        </div>
      </div>

      <div
        key={step}
        className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 animate-fadeIn"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* STEP 1 — Name & email (mandatory) */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                className={inputCls}
                placeholder="e.g. Aziz Aliyev"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Email Address *</label>
              <input
                type="email"
                className={inputCls}
                placeholder="aziz@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              You can update these later anytime from &quot;Edit Profile&quot;.
            </p>
          </div>
        )}

        {/* STEP 2 — Target degree */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEGREES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set("degreeLevel", d)}
                className={`rounded-2xl border-2 px-4 py-5 text-sm font-bold transition-all ${
                  form.degreeLevel === d
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* STEP 3 — Target major */}
        {step === 2 && (
          <div>
            <input
              className={inputCls}
              placeholder="e.g. Data Science & AI, Business Administration, Mechanical Engineering…"
              value={form.targetMajor}
              onChange={(e) => set("targetMajor", e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-2">
              A clear major helps us find universities and grants that fit you.
            </p>
          </div>
        )}

        {/* STEP 4 — GPA + scale */}
        {step === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>GPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                className={inputCls}
                placeholder="3.5"
                value={form.gpa}
                onChange={(e) => set("gpa", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>GPA Scale</label>
              <select
                className={inputCls}
                value={form.gpaScale}
                onChange={(e) => set("gpaScale", e.target.value)}
              >
                <option value="4.0">4.0 scale</option>
                <option value="5.0">5.0 scale</option>
                <option value="10.0">10.0 scale</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 5 — Standard tests */}
        {step === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>IELTS Score</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="9"
                className={inputCls}
                placeholder="6.5"
                value={form.ieltsScore}
                onChange={(e) => set("ieltsScore", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>TOEFL iBT</label>
              <input
                type="number"
                min="0"
                max="120"
                className={inputCls}
                placeholder="95"
                value={form.toeflScore}
                onChange={(e) => set("toeflScore", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>SAT Score</label>
              <input
                type="number"
                min="400"
                max="1600"
                className={inputCls}
                placeholder="1350"
                value={form.satScore}
                onChange={(e) => set("satScore", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>GRE General</label>
              <input
                type="number"
                min="260"
                max="340"
                className={inputCls}
                placeholder="315"
                value={form.greScore}
                onChange={(e) => set("greScore", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 6 — Budget & financial aid */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Annual Budget Limit (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  className={`${inputCls} pl-8`}
                  placeholder="25000"
                  value={form.budgetAnnualUsd}
                  onChange={(e) => set("budgetAnnualUsd", e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 cursor-pointer hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                checked={form.needScholarship}
                onChange={(e) => set("needScholarship", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                I need a full / partial scholarship
              </span>
            </label>
          </div>
        )}

        {/* STEP 7 — Preferred countries */}
        {step === 6 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {COUNTRIES.map((c) => {
              const active = form.preferredCountries.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCountry(c)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                    active
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 8 — Experience & achievements */}
        {step === 7 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Work / Internship Experience</label>
              <select
                className={inputCls}
                value={form.workExperienceYears}
                onChange={(e) => set("workExperienceYears", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="0">0 years</option>
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
                <option value="4">4 years</option>
                <option value="5">5+ years</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Research Papers / Publications</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                placeholder="0"
                value={form.researchPublications}
                onChange={(e) => set("researchPublications", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Extracurriculars & Achievements</label>
              <textarea
                rows={3}
                className={inputCls}
                placeholder="Hackathon winner, olympiad medals, volunteering, club leadership…"
                value={form.extracurriculars}
                onChange={(e) => set("extracurriculars", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center gap-2 mt-7 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {step !== 0 && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <SkipForward className="h-3.5 w-3.5" /> Skip
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={nextDisabled}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? "Saving…" : isLast ? "Finish" : "Continue"}
            {!saving && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function safeParseCountries(value?: string | null): string[] {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
