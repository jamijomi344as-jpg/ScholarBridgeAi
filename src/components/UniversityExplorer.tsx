"use client";

import React, { useState, useEffect } from "react";
import { StudentProfile } from "./Navbar";
import { 
  Search, 
  Globe, 
  GraduationCap, 
  DollarSign, 
  Award, 
  Filter, 
  Check, 
  Plus, 
  Columns, 
  ExternalLink,
  Briefcase,
  Star,
  BookOpen,
  Sparkles,
  X
} from "lucide-react";

export interface University {
  id: number;
  name: string;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: number;
  degreeLevel: string;
  programMajor: string;
  annualTuitionUsd: number;
  annualLivingEstUsd: number;
  minGpa: number;
  minIelts: number;
  minSat?: number | null;
  acceptanceRate: number;
  postStudyWorkVisaYears: number;
  description: string;
  highlights: string;
  websiteUrl: string;
  imageUrl: string;
  matchScore?: number;
  matchCategory?: "Reach" | "Match" | "Safety";
}

interface UniversityExplorerProps {
  activeProfile: StudentProfile | null;
  savedUniIds: Set<number>;
  onSaveUniversity: (uniId: number) => Promise<void>;
  onUnsaveUniversity: (uniId: number) => Promise<void>;
}

export function UniversityExplorer({
  activeProfile,
  savedUniIds,
  onSaveUniversity,
  onUnsaveUniversity,
}: UniversityExplorerProps) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [maxTuition, setMaxTuition] = useState<number>(70000);

  // Compare List
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    fetchUniversities();
  }, [activeProfile?.id, selectedCountry, selectedLevel, maxTuition]);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeProfile?.id) params.set("profileId", activeProfile.id.toString());
      if (selectedCountry !== "All") params.set("country", selectedCountry);
      if (selectedLevel !== "All") params.set("degreeLevel", selectedLevel);
      if (maxTuition < 70000) params.set("maxTuition", maxTuition.toString());

      const res = await fetch(`/api/universities?${params.toString()}`);
      const data = await res.json();
      if (data.universities) {
        setUniversities(data.universities);
      }
    } catch (err) {
      console.error("Error fetching universities:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUniversities = universities.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(s) ||
      u.programMajor.toLowerCase().includes(s) ||
      u.city.toLowerCase().includes(s) ||
      u.country.toLowerCase().includes(s)
    );
  });

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 3) {
          alert("You can compare up to 3 universities at once.");
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const comparedUniversities = universities.filter((u) => compareIds.includes(u.id));

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-600" />
              Global University & Program Explorer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtered by match criteria against {activeProfile?.name || "active student profile"}.
            </p>
          </div>

          {compareIds.length > 0 && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl text-xs shadow-md hover:shadow-indigo-200 transition-all"
            >
              <Columns className="h-4 w-4" />
              Compare Selected ({compareIds.length})
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Text Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search university, major, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Country Filter */}
          <div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="All">🌐 All Destinations</option>
              <option value="United States">🇺🇸 United States</option>
              <option value="United Kingdom">🇬🇧 United Kingdom</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Germany">🇩🇪 Germany</option>
              <option value="Singapore">🇸🇬 Singapore</option>
              <option value="Australia">🇦🇺 Australia</option>
              <option value="Switzerland">🇨🇭 Switzerland</option>
              <option value="Netherlands">🇳🇱 Netherlands</option>
              <option value="Japan">🇯🇵 Japan</option>
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="All">🎓 All Degree Levels</option>
              <option value="Bachelor">Bachelor Degree</option>
              <option value="Master">Master Degree</option>
              <option value="PhD">PhD / Doctorate</option>
            </select>
          </div>

          {/* Max Tuition Slider */}
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex flex-col justify-center">
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
              <span>Max Tuition:</span>
              <span className="text-indigo-600 font-bold">${(maxTuition || 0).toLocaleString()}/yr</span>
            </div>
            <input
              type="range"
              min="5000"
              max="70000"
              step="5000"
              value={maxTuition}
              onChange={(e) => setMaxTuition(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Results Count & Active Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Showing {filteredUniversities.length} matched university programs</span>
        <span>Sorted by Match Score & Fit</span>
      </div>

      {/* University Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          Loading universities & evaluating profile matches...
        </div>
      ) : filteredUniversities.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No universities match your filter criteria. Try adjusting max tuition or target country.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((uni) => {
            const isSaved = savedUniIds.has(uni.id);
            const isCompared = compareIds.includes(uni.id);

            let matchBadgeColor = "bg-blue-100 text-blue-800 border-blue-200";
            if (uni.matchCategory === "Safety") {
              matchBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
            } else if (uni.matchCategory === "Reach") {
              matchBadgeColor = "bg-purple-100 text-purple-800 border-purple-200";
            }

            let highlightsList: string[] = [];
            try {
              highlightsList = JSON.parse(uni.highlights);
            } catch {
              highlightsList = [];
            }

            return (
              <div
                key={uni.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg hover:border-indigo-300 transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Top Image Banner */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  <img
                    src={uni.imageUrl}
                    alt={`${uni.name} — ${uni.city}, ${uni.country}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />

                  {/* Match Score Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs ${matchBadgeColor}`}>
                      {uni.matchScore}% Match • {uni.matchCategory}
                    </span>
                  </div>

                  {/* World Rank Badge */}
                  <div className="absolute top-3 right-3 bg-slate-900/80 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-300" />
                    World #{uni.worldRanking ?? '—'}
                  </div>

                  {/* Title & Country Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="text-xs font-medium text-slate-200 flex items-center gap-1">
                      <span>{uni.flagEmoji}</span>
                      <span>{uni.city}, {uni.country}</span>
                    </div>
                    <h3 className="font-bold text-base leading-tight drop-shadow-xs line-clamp-1">{uni.name}</h3>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Major & Program */}
                    <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 mb-2 inline-block">
                      {uni.programMajor}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {uni.description}
                    </p>

                    {/* Key Requirements Grid */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Annual Tuition:</span>
                        <strong className="text-slate-900">${(uni.annualTuitionUsd || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Living Est.:</span>
                        <strong className="text-slate-900">${(uni.annualLivingEstUsd || 0).toLocaleString()}/yr</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Min GPA:</span>
                        <strong className="text-slate-900">{uni.minGpa} / 4.0</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Min IELTS:</span>
                        <strong className="text-slate-900">{uni.minIelts}</strong>
                      </div>
                    </div>

                    {/* Highlights Badges */}
                    {highlightsList.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {highlightsList.map((hl, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                            ✓ {hl}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post-study Work Permit Banner */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                      Post-Study Work Visa:
                    </span>
                    <strong className="text-slate-900 font-bold">{uni.postStudyWorkVisaYears ?? '—'} Years</strong>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => toggleCompare(uni.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Compare</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <a
                        href={uni.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition-colors"
                        title="Visit Official Portal"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>

                      {isSaved ? (
                        <button
                          onClick={() => onUnsaveUniversity(uni.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs hover:bg-red-100 hover:text-red-700 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Saved
                        </button>
                      ) : (
                        <button
                          onClick={() => onSaveUniversity(uni.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Shortlist
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Columns className="h-5 w-5" />
                Side-by-Side University Comparison
              </h3>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 font-bold text-slate-500 w-1/4">Metric</th>
                    {comparedUniversities.map((u) => (
                      <th key={u.id} className="py-3 px-4 font-bold text-slate-900 text-sm w-1/4">
                        <div className="flex items-center gap-1">
                          <span>{u.flagEmoji}</span>
                          <span>{u.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">World Ranking</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-bold text-indigo-600">#{u.worldRanking ?? '—'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">Match Score</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-bold text-emerald-600">{u.matchScore}% ({u.matchCategory})</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">Annual Tuition</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900 font-bold">${(u.annualTuitionUsd || 0).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">Living Expenses</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">${(u.annualLivingEstUsd || 0).toLocaleString()}/yr</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">Post-Study Work Visa</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-bold text-amber-700">{u.postStudyWorkVisaYears ?? '—'} Years</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">Min GPA Cutoff</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">{u.minGpa} / 4.0</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">Min IELTS Cutoff</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">{u.minIelts}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">Acceptance Rate</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">{u.acceptanceRate ?? '—'}%</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
