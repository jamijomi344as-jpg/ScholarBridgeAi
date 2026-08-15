"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  BookOpen,
  GraduationCap,
  DollarSign,
  FileText,
  Calendar,
  CheckCircle2,
  Building2,
  Star,
  ShieldCheck,
} from "lucide-react";

interface UniversityDetailData {
  id: number;
  name: string;
  shortName: string | null;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: number;
  universityType: string | null;
  foundedYear: number | null;
  internationalStudentsCount: number | null;
  internationalStudentsPct: number | null;
  annualTuitionUsd: number | null;
  tuitionCurrency: string;
  annualLivingEstUsd: number | null;
  applicationFee: number | null;
  minGpa: number | null;
  minIelts: number | null;
  minToefl: number | null;
  minDuolingo: number | null;
  minSat: number | null;
  minAct: number | null;
  acceptanceRate: number | null;
  postStudyWorkVisaYears: number | null;
  postStudyVisaNote: string | null;
  isEnglishTaught: boolean;
  description: string;
  websiteUrl: string;
  undergraduateUrl: string | null;
  internationalUrl: string | null;
  applicationPlatform: string | null;
  imageUrl: string | null;
  verificationStatus: string;
}

interface ProgramData {
  id: number;
  name: string;
  field: string | null;
  degree: string | null;
  durationYears: number | null;
  language: string | null;
  tuitionAmount: number | null;
  tuitionCurrency: string;
  applicationDeadline: string | null;
  minIelts: number | null;
  minSat: number | null;
  programUrl: string | null;
  requirements: { requirementType: string; minimumValue: number | null; valueText: string | null }[];
}

interface SourceData {
  id: number;
  title: string;
  url: string;
  sourceType: string;
}

interface UniversityDetailProps {
  universityId: number;
  onBack: () => void;
}

/** Spec §19: verified vs unavailable. NULL is never shown as a value. */
function fmtMoney(v: number | null | undefined, currency = "USD"): string {
  if (v == null) return "Not available";
  const sym = currency === "USD" ? "$" : currency + " ";
  return `${sym}${v.toLocaleString()} / year`;
}

function fmtValue(v: string | number | null | undefined, suffix = ""): string {
  if (v == null || v === "") return "Not specified";
  return `${v}${suffix}`;
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${value === "Not specified" || value === "Not available" ? "text-slate-400" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

export function UniversityDetail({ universityId, onBack }: UniversityDetailProps) {
  const [uni, setUni] = useState<UniversityDetailData | null>(null);
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/universities/${universityId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (!cancelled) {
          setUni(data.university);
          setPrograms(data.programs || []);
          setSources(data.sources || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load university");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [universityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-xs font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading university…
      </div>
    );
  }

  if (error || !uni) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-xs font-bold text-red-700">{error || "University not found"}</p>
        <button onClick={onBack} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to universities
      </button>

      {/* ===== HERO (spec §2) ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_10%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {uni.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uni.imageUrl}
                alt={`${uni.name} logo`}
                className="h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-amber-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{uni.name}</h1>
                {uni.shortName && (
                  <span className="rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold">
                    {uni.shortName}
                  </span>
                )}
              </div>
              <p className="text-sm text-indigo-200 mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {uni.city}, {uni.country} {uni.flagEmoji}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                <span className="text-xs font-bold">QS World Ranking 2027</span>
                <span className="text-sm font-extrabold text-amber-300">#{uni.worldRanking}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {uni.websiteUrl && (
                <a
                  href={uni.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-4 py-2 text-xs font-bold hover:bg-indigo-50"
                >
                  <Globe className="h-3.5 w-3.5" /> Official Website
                </a>
              )}
              {uni.internationalUrl && (
                <a
                  href={uni.internationalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 text-slate-900 px-4 py-2 text-xs font-bold hover:bg-amber-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Apply (International)
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== ABOUT (spec §3) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-600" /> About {uni.name}
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="University type" value={fmtValue(uni.universityType)} icon={<Building2 className="h-3 w-3" />} />
          <Field label="Founded" value={fmtValue(uni.foundedYear)} icon={<Calendar className="h-3 w-3" />} />
          <Field label="Acceptance rate" value={uni.acceptanceRate != null ? `${uni.acceptanceRate}%` : "Not specified"} />
          <Field label="English-taught" value={uni.isEnglishTaught ? "Yes" : "Not specified"} />
        </div>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          {uni.description && uni.description !== "" ? uni.description : "Official description not available."}
        </p>
      </div>

      {/* ===== ACADEMIC REQUIREMENTS (spec §5) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-indigo-600" /> Academic Requirements
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Minimum IELTS" value={uni.minIelts != null ? `IELTS ${uni.minIelts}` : "Not specified"} />
          <Field label="Minimum TOEFL" value={uni.minToefl != null ? `TOEFL ${uni.minToefl}` : "Not specified"} />
          <Field label="Minimum Duolingo" value={uni.minDuolingo != null ? `${uni.minDuolingo}` : "Not specified"} />
          <Field label="Minimum GPA" value={uni.minGpa != null ? `${uni.minGpa} / 4.0` : "Not specified"} />
          <Field label="Minimum SAT" value={uni.minSat != null ? `${uni.minSat}` : "Not specified"} />
          <Field label="Minimum ACT" value={uni.minAct != null ? `${uni.minAct}` : "Not specified"} />
        </div>
        <p className="mt-3 text-[11px] text-slate-400 italic">
          Only officially verified minimums are shown. If a value is not specified by the university, it is marked "Not specified".
        </p>
      </div>

      {/* ===== TUITION & COSTS (spec §6) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" /> Tuition &amp; Costs
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Annual tuition" value={fmtMoney(uni.annualTuitionUsd, uni.tuitionCurrency)} />
          <Field label="Living estimate" value={fmtMoney(uni.annualLivingEstUsd)} />
          <Field label="Application fee" value={uni.applicationFee != null ? fmtMoney(uni.applicationFee) : "Not available"} />
        </div>
      </div>

      {/* ===== PROGRAMS (spec §7) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-600" /> Programs ({programs.length})
        </h2>
        {programs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">Program list not available yet — check the official website.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {programs.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 p-4 hover:border-violet-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">{p.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {fmtValue(p.degree)} · {p.durationYears != null ? `${p.durationYears} years` : "Duration not specified"} · {fmtValue(p.language)}
                    </p>
                  </div>
                  {p.programUrl && (
                    <a href={p.programUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-800 shrink-0" title="View program">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span><b>Tuition:</b> {fmtMoney(p.tuitionAmount, p.tuitionCurrency)}</span>
                  <span><b>IELTS:</b> {p.minIelts != null ? p.minIelts : "Not specified"}</span>
                  {p.applicationDeadline && <span><b>Deadline:</b> {p.applicationDeadline}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== POST-STUDY (spec §11) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-sky-600" /> Post-Study Work
        </h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Post-study work visa"
            value={uni.postStudyWorkVisaYears != null ? `${uni.postStudyWorkVisaYears} years` : "Not specified"}
          />
          <Field label="Visa note" value={fmtValue(uni.postStudyVisaNote)} />
        </div>
      </div>

      {/* ===== INTERNATIONAL STUDENTS (spec §9) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Globe className="h-4 w-4 text-teal-600" /> International Students
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field
            label="International students"
            value={uni.internationalStudentsCount != null ? uni.internationalStudentsCount.toLocaleString() : "Not available"}
          />
          <Field
            label="Share of students"
            value={uni.internationalStudentsPct != null ? `${uni.internationalStudentsPct}%` : "Not available"}
          />
        </div>
      </div>

      {/* ===== SOURCES (spec §13) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Sources
        </h2>
        <div className="mt-3 space-y-2">
          {uni.websiteUrl && (
            <a href={uni.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
              <ExternalLink className="h-3 w-3" /> Official University Website
            </a>
          )}
          {sources.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
              <ExternalLink className="h-3 w-3" /> {s.title}
            </a>
          ))}
          {sources.length === 0 && (
            <p className="text-[11px] text-slate-400">QS World University Rankings 2027 (verified ranking source).</p>
          )}
        </div>
      </div>
    </div>
  );
}
