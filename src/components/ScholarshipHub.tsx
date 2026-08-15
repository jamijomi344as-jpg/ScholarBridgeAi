"use client";

import React, { useState, useEffect } from "react";
import { StudentProfile } from "./Navbar";
import { 
  Award, 
  Search, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  ExternalLink, 
  Plus, 
  Check, 
  Sparkles,
  BookOpen,
  Filter
} from "lucide-react";

export interface Scholarship {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: number;
  deadline: string;
  degreeLevels: string;
  eligibleMajors: string;
  minGpa?: number | null;
  minIelts?: number | null;
  financialNeedBased?: boolean | null;
  meritBased?: boolean | null;
  description: string;
  requirements: string;
  websiteUrl: string;
  matchScore?: number;
  isEligible?: boolean;
  // Computed application status (spec §6)
  computedStatus?: string;
  statusLabel?: string;
  expectedLabel?: string | null;
}

interface ScholarshipHubProps {
  activeProfile: StudentProfile | null;
  savedScholarshipIds: Set<number>;
  onSaveScholarship: (scholarshipId: number) => Promise<void>;
  onUnsaveScholarship: (scholarshipId: number) => Promise<void>;
}

export function ScholarshipHub({
  activeProfile,
  savedScholarshipIds,
  onSaveScholarship,
  onUnsaveScholarship,
}: ScholarshipHubProps) {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCoverage, setSelectedCoverage] = useState("All");

  useEffect(() => {
    fetchScholarships();
  }, [activeProfile?.id, selectedCountry, selectedCoverage]);

  const fetchScholarships = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeProfile?.id) params.set("profileId", activeProfile.id.toString());
      if (selectedCountry !== "All") params.set("country", selectedCountry);
      if (selectedCoverage !== "All") params.set("coverageType", selectedCoverage);

      const res = await fetch(`/api/scholarships?${params.toString()}`);
      const data = await res.json();
      if (data.scholarships) {
        setScholarships(data.scholarships);
      }
    } catch (err) {
      console.error("Error fetching scholarships:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = scholarships.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.provider.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Global Financial Aid & Scholarship Discovery Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover fully-funded government awards, university merit grants, and need-based financial aid.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search scholarship name, provider, or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Country Filter */}
          <div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
            >
              <option value="All">🌐 All Host Countries</option>
              <option value="United States">🇺🇸 United States</option>
              <option value="United Kingdom">🇬🇧 United Kingdom</option>
              <option value="Germany">🇩🇪 Germany</option>
              <option value="European Union">🇪🇺 European Union</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Japan">🇯🇵 Japan</option>
            </select>
          </div>

          {/* Coverage Filter */}
          <div>
            <select
              value={selectedCoverage}
              onChange={(e) => setSelectedCoverage(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
            >
              <option value="All">💵 All Coverage Levels</option>
              <option value="Full Tuition + Stipend">Full Tuition + Living Stipend</option>
              <option value="Full Tuition">Full Tuition Only</option>
              <option value="Partial Tuition">Partial Grant / Subsidy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          Loading global scholarship dataset & checking eligibility...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No scholarships found matching criteria. Try resetting filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((s) => {
            const isSaved = savedScholarshipIds.has(s.id);
            const score = s.matchScore || 80;

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg hover:border-amber-300 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {s.country} • {s.provider}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 mt-1">{s.title}</h3>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      {score}% Eligibility
                    </span>
                  </div>

                  {/* Computed application status (spec §6) */}
                  {s.computedStatus && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          s.computedStatus === "open"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : s.computedStatus === "closed"
                            ? "bg-slate-200 text-slate-600 border border-slate-200"
                            : s.computedStatus === "rolling"
                            ? "bg-sky-100 text-sky-700 border border-sky-200"
                            : s.computedStatus === "upcoming"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {s.statusLabel}
                      </span>
                      {s.expectedLabel && (
                        <span className="text-[10px] text-slate-400 italic">({s.expectedLabel})</span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {s.description}
                  </p>
                </div>

                {/* Key Details Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-medium">Award Value:</span>
                    <strong className="text-emerald-700 font-extrabold">${s.amountUsdValue?.toLocaleString()} / yr</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Coverage:</span>
                    <strong className="text-slate-800 font-bold">{s.coverageType}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Deadline:</span>
                    <strong className="text-amber-800 font-bold flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {s.deadline}
                    </strong>
                  </div>
                </div>

                {/* Requirements Text */}
                <div className="text-xs bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 text-amber-900 space-y-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">
                    Requirements & Eligibility:
                  </span>
                  <p className="text-[11px] leading-relaxed">{s.requirements}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <a
                    href={s.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                  >
                    Official Application Portal <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {isSaved ? (
                    <button
                      onClick={() => onUnsaveScholarship(s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs hover:bg-red-100 hover:text-red-700 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Tracked
                    </button>
                  ) : (
                    <button
                      onClick={() => onSaveScholarship(s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs shadow-xs transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Track Scholarship
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
