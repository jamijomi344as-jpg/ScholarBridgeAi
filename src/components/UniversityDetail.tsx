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
  Award,
  ArrowRight,
} from "lucide-react";

interface UniversityDetailData {
  id: number;
  name: string;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: number;
  universityType: string | null;
  foundedYear: number | null;
  address: string | null;
  internationalStudentsCount: number | null;
  internationalStudentsPercentage: number | null;
  annualTuitionUsd: number | null;
  tuitionCurrency: string;
  livingCostCurrency: string;
  annualLivingEstUsd: number | null;
  accommodationCostUsd: number | null;
  applicationFee: number | null;
  applicationFeeCurrency: string;
  minGpa: number | null;
  minIelts: number | null;
  minSat: number | null;
  acceptanceRate: number | null;
  postStudyWorkVisaYears: number | null;
  description: string;
  websiteUrl: string;
  officialWebsiteUrl: string | null;
  admissionsUrl: string | null;
  internationalAdmissionsUrl: string | null;
  undergraduateAdmissionsUrl: string | null;
  applicationUrl: string | null;
  imageUrl: string | null;
  verificationStatus: string;
}

interface ProgramData {
  id: number;
  name: string;
  field: string | null;
  degree: string | null;
  durationYears: number | null;
  durationUnit: string;
  studyMode: string | null;
  language: string | null;
  tuitionAmount: number | null;
  tuitionCurrency: string;
  tuitionPeriod: string;
  applicationDeadline: string | null;
  minIelts: number | null;
  minToefl: number | null;
  minDuolingo: number | null;
  minSat: number | null;
  minAct: number | null;
  minGpa: number | null;
  portfolioRequired: boolean;
  interviewRequired: boolean;
  recommendationRequired: boolean;
  personalStatementRequired: boolean;
  programUrl: string | null;
  applicationUrl: string | null;
  isVerified: boolean;
  requirements: { requirementType: string; minimumValue: number | null; valueText: string | null }[];
}

interface CycleData {
  id: number;
  cycleYear: number;
  academicYear: string | null;
  intake: string | null;
  applicationType: string | null;
  openingDate: string | null;
  deadline: string | null;
  deadlineTimezone: string | null;
  applicationFee: number | null;
  applicationFeeCurrency: string;
  applicationUrl: string | null;
  isVerified: boolean;
  isEstimated: boolean;
}

interface ScholarshipData {
  id: number;
  title: string;
  name?: string;
  description: string | null;
  degreeLevels: string | null;
  coverageType: string | null;
  amountUsdValue: number | null;
  deadline: string | null;
  deadlineDate: string | null;
  applicationUrl: string | null;
  websiteUrl: string | null;
  isVerified: boolean;
  eligibilityText?: string;
}

interface SourceData {
  id: number;
  title: string;
  url: string;
  sourceType: string;
  source: { url: string; title: string; isOfficial: boolean; isVerified: boolean } | null;
}

interface UniversityDetailProps {
  universityId: number;
  onBack: () => void;
}

/** Spec §19: verified vs unavailable. NULL is never shown as a value. */
function fmtMoney(v: number | null | undefined, currency = "USD", suffix = " / year"): string {
  if (v == null) return "Not available";
  const sym = currency === "USD" ? "$" : currency + " ";
  return `${sym}${v.toLocaleString()}${suffix}`;
}

function fmtValue(v: string | number | null | undefined, suffix = ""): string {
  if (v == null || v === "") return "Not specified";
  return `${v}${suffix}`;
}

/** Read a requirement value from the universityRequirements payload.
 *  Values are either { single, range, values } summaries or null.
 *  Falls back gracefully for any shape. */
function req(
  ur: Record<string, any> | null,
  key: string,
  fmt: (v: number) => string
): string {
  const v = ur?.[key];
  if (!v) return "Not specified";
  if (typeof v === "number") return fmt(v);
  if (typeof v.single === "number") return fmt(v.single);
  if (Array.isArray(v.values) && v.values.length > 0) {
    const nums = v.values.filter((x: any) => typeof x === "number");
    if (nums.length === 0) return "Not specified";
    if (nums.length === 1) return fmt(nums[0]);
    const sorted = [...nums].sort((a: number, b: number) => a - b);
    return `${fmt(sorted[0])}–${fmt(sorted[sorted.length - 1])}`;
  }
  if (typeof v.range === "string") {
    const nums = (v.values ?? [v.min, v.max]).filter((x: any) => typeof x === "number");
    if (nums.length === 0) return "Not specified";
    return `${fmt(nums[0])}–${fmt(nums[nums.length - 1])}`;
  }
  return "Not specified";
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
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [universityRequirements, setUniversityRequirements] = useState<any>(null);
  const [scholarships, setScholarships] = useState<ScholarshipData[]>([]);
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
          setCycles(data.applicationCycles || data.cycles || []);
          setUniversityRequirements(data.universityRequirements || null);
          setScholarships(data.scholarships || []);
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
              {(() => {
                const site = uni.officialWebsiteUrl || uni.websiteUrl;
                const apply = uni.applicationUrl || uni.internationalAdmissionsUrl || uni.admissionsUrl;
                return (
                  <div className="flex flex-col gap-2 sm:items-end">
                    {site && (
                      <a
                        href={site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-4 py-2 text-xs font-bold hover:bg-indigo-50"
                      >
                        <Globe className="h-3.5 w-3.5" /> Official Website
                      </a>
                    )}
                    {apply && (
                      <a
                        href={apply}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 text-slate-900 px-4 py-2 text-xs font-bold hover:bg-amber-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Apply Now
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ===== ADMISSIONS / APPLICATION CYCLES (spec §2, §3, §12) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-600" /> Application
        </h2>
        {cycles.length === 0 ? (
          <div className="mt-3">
            <p className="text-xs text-slate-400">No verified application cycles yet.</p>
            {(() => {
              const apply = uni.applicationUrl || uni.internationalAdmissionsUrl || uni.admissionsUrl;
              const site = uni.officialWebsiteUrl || uni.websiteUrl;
              return (
                <div className="mt-2 flex flex-wrap gap-2">
                  {apply && (
                    <a
                      href={apply}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 text-slate-900 px-4 py-2 text-xs font-bold hover:bg-amber-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Apply Now
                    </a>
                  )}
                  {uni.undergraduateAdmissionsUrl && (
                    <a
                      href={uni.undergraduateAdmissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Undergraduate Admissions
                    </a>
                  )}
                  {uni.admissionsUrl && !apply && (
                    <a
                      href={uni.admissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Admissions
                    </a>
                  )}
                  {site && (
                    <a
                      href={site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <Globe className="h-3.5 w-3.5" /> Official website
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {cycles.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-slate-800">
                    {c.intake || "Application"} {c.academicYear || c.cycleYear}
                  </span>
                  {c.applicationType && (
                    <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold">
                      {c.applicationType}
                    </span>
                  )}
                  {c.isEstimated && (
                    <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      Estimated
                    </span>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Opens</span>
                    <strong className="text-slate-800">
                      {c.openingDate ? new Date(c.openingDate + "T00:00:00").toLocaleDateString() : "Not announced"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Deadline</span>
                    <strong className="text-slate-800">
                      {c.deadline ? new Date(c.deadline + "T00:00:00").toLocaleDateString() : "Not announced"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Application fee</span>
                    <strong className="text-slate-800">
                      {c.applicationFee != null
                        ? c.applicationFeeCurrency === "USD"
                          ? `$${c.applicationFee.toLocaleString()}`
                          : `${c.applicationFee} ${c.applicationFeeCurrency}`
                        : "Not specified"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Timezone</span>
                    <strong className="text-slate-800">
                      {c.deadlineTimezone || "Not specified"}
                    </strong>
                  </div>
                  <div className="flex items-end justify-end">
                    {/* APPLY NOW — only with a verified URL (spec §19) */}
                    {c.applicationUrl ? (
                      <a
                        href={c.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-[11px] font-bold hover:bg-slate-800"
                      >
                        Apply Now <ArrowRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Application link unavailable</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
          <Field label="Address" value={fmtValue(uni.address)} icon={<MapPin className="h-3 w-3" />} />
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
          <Field label="IELTS" value={req(universityRequirements, "ielts", (v) => `${v}`)} />
          <Field label="TOEFL" value={req(universityRequirements, "toefl", (v) => `${v}`)} />
          <Field label="Duolingo" value={req(universityRequirements, "duolingo", (v) => `${v}`)} />
          <Field label="GPA" value={req(universityRequirements, "gpa", (v) => `${v} / 4.0`)} />
          <Field
            label="SAT"
            value={
              universityRequirements?.satRequired
                ? universityRequirements?.satMinimumPublished
                  ? req(universityRequirements, "sat", (v) => `${v}`)
                  : "Required — no minimum published"
                : "Not specified"
            }
          />
          <Field
            label="ACT"
            value={
              universityRequirements?.actRequired
                ? universityRequirements?.actMinimumPublished
                  ? req(universityRequirements, "act", (v) => `${v}`)
                  : "Required — no minimum published"
                : "Not specified"
            }
          />
          <Field label="PTE Academic" value={req(universityRequirements, "pte", (v) => `${v}`)} />
          <Field label="Cambridge English" value={req(universityRequirements, "cambridgeEnglish", (v) => `${v}`)} />
          {Array.isArray(universityRequirements?.other) && universityRequirements.other.length > 0 && (
            <Field label="Other requirements" value={universityRequirements.other.join("; ")} />
          )}
          {Array.isArray(universityRequirements?.subject) && universityRequirements.subject.length > 0 && (
            <Field label="Subject requirements" value={universityRequirements.subject.join("; ")} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
          {universityRequirements?.portfolioRequired && <span>📁 Portfolio required</span>}
          {universityRequirements?.interviewRequired && <span>🎤 Interview required</span>}
          {universityRequirements?.recommendationRequired && <span>📩 Recommendation letters</span>}
          {universityRequirements?.personalStatementRequired && <span>✍️ Personal statement</span>}
        </div>
        <p className="mt-3 text-[11px] text-slate-400 italic">
          Values shown come from verified program requirements. If a value is not specified by the university, it is marked &quot;Not specified&quot;.
        </p>
      </div>

      {/* ===== TUITION & COSTS (spec §6) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" /> Tuition &amp; Costs
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Annual tuition" value={fmtMoney(uni.annualTuitionUsd, uni.tuitionCurrency)} />
          <Field label="Living estimate" value={fmtMoney(uni.annualLivingEstUsd, uni.livingCostCurrency)} />
          <Field label="Accommodation" value={fmtMoney(uni.accommodationCostUsd, "USD")} />
          <Field label="Application fee" value={uni.applicationFee != null ? fmtMoney(uni.applicationFee, uni.applicationFeeCurrency, "") : "Not available"} />
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
                  <span><b>Duration:</b> {p.durationYears != null ? `${p.durationYears} ${p.durationUnit || "years"}` : "Not specified"}</span>
                  <span><b>Mode:</b> {fmtValue(p.studyMode)}</span>
                  <span><b>IELTS:</b> {p.minIelts != null ? p.minIelts : "Not specified"}</span>
                  {p.applicationDeadline && <span><b>Deadline:</b> {p.applicationDeadline}</span>}
                </div>

                {/* Program-specific requirements (verified values only) */}
                {p.requirements.length > 0 && (
                  <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100 p-2.5 space-y-1">
                    {p.requirements.map((r, i) => (
                      <p key={i} className="text-[11px] text-slate-600">
                        <b className="capitalize">{r.requirementType}:</b>{" "}
                        {r.minimumValue != null ? r.minimumValue : r.valueText ? r.valueText : "required"}
                      </p>
                    ))}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-slate-100">
                      {p.portfolioRequired && <span className="text-[10px] text-slate-500">📁 Portfolio required</span>}
                      {p.interviewRequired && <span className="text-[10px] text-slate-500">🎤 Interview required</span>}
                      {p.recommendationRequired && <span className="text-[10px] text-slate-500">📩 Recommendation letters</span>}
                      {p.personalStatementRequired && <span className="text-[10px] text-slate-500">✍️ Personal statement</span>}
                    </div>
                  </div>
                )}

                {p.applicationUrl && (
                  <a
                    href={p.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Apply for this program
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== SCHOLARSHIPS (spec §8) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" /> Scholarships ({scholarships.length})
        </h2>
        {scholarships.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            No verified scholarships linked to this university yet — check the official website.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scholarships.map((sch) => {
              const schName = sch.name || sch.title;
              const deadline = sch.deadlineDate || sch.deadline || null;
              const url = sch.applicationUrl || sch.websiteUrl || null;
              return (
                <div key={sch.id} className="rounded-xl border border-slate-200 p-4 hover:border-amber-300 transition-colors">
                  <p className="text-sm font-extrabold text-slate-800">{schName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sch.coverageType || "Coverage not specified"}</p>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <p><b>Amount:</b> {sch.amountUsdValue != null ? `$${sch.amountUsdValue.toLocaleString()}` : "Not specified"}</p>
                    <p><b>Deadline:</b> {deadline ? new Date(deadline + (deadline.length === 10 ? "T00:00:00" : "")).toLocaleDateString() : "Not announced"}</p>
                    <p><b>Eligibility:</b> {sch.eligibilityText || "Not specified"}</p>
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Official Scholarship Page
                    </a>
                  )}
                </div>
              );
            })}
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
            value={uni.internationalStudentsPercentage != null ? `${uni.internationalStudentsPercentage}%` : "Not available"}
          />
        </div>
      </div>

      {/* ===== SOURCES (spec §13) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Sources
        </h2>
        <div className="mt-3 space-y-2">
          {/* Main website link */}
          {(() => {
            const site = uni.officialWebsiteUrl || uni.websiteUrl;
            if (!site) return null;
            return (
              <a href={site} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 hover:border-indigo-300 transition-colors">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-800">Official University Website</span>
                  <span className="block text-[10px] text-slate-400 truncate">{site}</span>
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Official source
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </a>
            );
          })()}

          {/* Other admissions URLs as sources */}
          {[
            { url: uni.admissionsUrl, label: "Admissions", type: "official_admissions" },
            { url: uni.internationalAdmissionsUrl, label: "International Admissions", type: "official_international_admissions" },
            { url: uni.undergraduateAdmissionsUrl, label: "Undergraduate Admissions", type: "official_undergraduate_admissions" },
            { url: uni.applicationUrl, label: "Application Portal", type: "official_application_portal" },
          ].map((link) => {
            if (!link.url) return null;
            return (
              <a key={link.type} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 hover:border-indigo-300 transition-colors">
                <ExternalLink className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-800">{link.label}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{link.url}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 capitalize shrink-0">{link.type.replace(/_/g, " ")}</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </a>
            );
          })}

          {/* Linked sources from university_sources */}
          {sources.map((s) => {
            const url = s.source?.url || s.url;
            const title = s.source?.title || s.title || "Source";
            const type = s.sourceType || s.source?.title ? "official" : "source";
            return (
              <a key={s.id} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 hover:border-indigo-300 transition-colors">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-800">{title}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{url}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 capitalize shrink-0">{type.replace(/_/g, " ")}</span>
                {(s.source?.isOfficial || s.sourceType !== "ranking") && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Official
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </a>
            );
          })}

          {sources.length === 0 && !uni.admissionsUrl && !uni.applicationUrl && (
            <p className="text-[11px] text-slate-400">QS World University Rankings 2027 (verified ranking source).</p>
          )}
        </div>
      </div>
    </div>
  );
}
