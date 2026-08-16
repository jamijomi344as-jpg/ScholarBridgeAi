"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { StudentProfile } from "./Navbar";
import { University } from "./UniversityExplorer";
import { Scholarship } from "./ScholarshipHub";
import { 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Save, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock
} from "lucide-react";
import { formatMoney } from "@/lib/format";

export interface SavedUniversityItem {
  id: number;
  profileId: number;
  universityId: number;
  matchCategory: string;
  matchScore: number;
  status: string;
  notes: string;
  university: University;
}

export interface SavedScholarshipItem {
  id: number;
  profileId: number;
  scholarshipId: number;
  status: string;
  notes: string;
  scholarship: Scholarship;
}

interface ApplicationTrackerProps {
  activeProfile: StudentProfile | null;
  savedUniversities: SavedUniversityItem[];
  savedScholarships: SavedScholarshipItem[];
  onUpdateSavedUniStatus: (id: number, status: string, notes?: string) => Promise<void>;
  onRemoveSavedUni: (id: number) => Promise<void>;
  onUpdateSavedScholarshipStatus: (id: number, status: string, notes?: string) => Promise<void>;
  onRemoveSavedScholarship: (id: number) => Promise<void>;
}

export function ApplicationTracker({
  activeProfile,
  savedUniversities,
  savedScholarships,
  onUpdateSavedUniStatus,
  onRemoveSavedUni,
  onUpdateSavedScholarshipStatus,
  onRemoveSavedScholarship,
}: ApplicationTrackerProps) {
  const [activeSubTab, setActiveTab] = useState<"universities" | "scholarships">("universities");
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  const uniStatuses = ["Shortlisted", "Preparing Application", "Submitted", "Accepted", "Enrolled", "Rejected"];
  const scholarshipStatuses = ["Saved", "Drafting Essay", "Docs Submitted", "Awarded", "Declined"];

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // fallback
    }
  };

  const handleUniStatusChange = async (id: number, newStatus: string) => {
    await onUpdateSavedUniStatus(id, newStatus);
    if (newStatus === "Accepted" || newStatus === "Enrolled") {
      fireCelebration();
    }
  };

  const handleScholarshipStatusChange = async (id: number, newStatus: string) => {
    await onUpdateSavedScholarshipStatus(id, newStatus);
    if (newStatus === "Awarded") {
      fireCelebration();
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tab Picker */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            My Applications
          </h1>
          <p className="text-xs text-slate-500 hidden md:block">
            Track stage milestones & notes for {activeProfile?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("universities")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeSubTab === "universities"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            University Applications ({savedUniversities.length})
          </button>

          <button
            onClick={() => setActiveTab("scholarships")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeSubTab === "scholarships"
                ? "bg-amber-500 text-slate-900 shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Award className="h-4 w-4" />
            Scholarship Applications ({savedScholarships.length})
          </button>
        </div>
      </div>

      {/* Universities Tracker */}
      {activeSubTab === "universities" && (
        <div className="space-y-4">
          {savedUniversities.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              No universities shortlisted yet. Go to the <strong>University Explorer</strong> tab to search and save target programs.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedUniversities.map((item) => {
                const u = item.university;
                if (!u) return null;

                const isEditingThisNotes = editingNotesId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-indigo-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    {/* Left Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{u.flagEmoji}</span>
                        <h3 className="font-bold text-base text-slate-900">{u.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.matchScore}% Match ({item.matchCategory})
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>🎓 {u.programMajor}</span>
                        <span>💵 Tuition: {formatMoney(u.annualTuitionUsd, "USD", { suffix: "/yr" })}</span>
                        <span>📍 {u.city}, {u.country}</span>
                      </div>

                      {/* Notes Box */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-500 text-[10px] uppercase">My Application Notes:</span>
                          {!isEditingThisNotes && (
                            <button
                              onClick={() => {
                                setEditingNotesId(item.id);
                                setTempNotes(item.notes || "");
                              }}
                              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Edit3 className="h-3 w-3" /> Edit Notes
                            </button>
                          )}
                        </div>

                        {isEditingThisNotes ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <button
                              onClick={async () => {
                                await onUpdateSavedUniStatus(item.id, item.status, tempNotes);
                                setEditingNotesId(null);
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" /> Save Notes
                            </button>
                          </div>
                        ) : (
                          <p className="italic text-slate-600">
                            {item.notes ? item.notes : "No custom notes written. Click Edit Notes to add reminders."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                        <select
                          value={item.status}
                          onChange={(e) => handleUniStatusChange(item.id, e.target.value)}
                          className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border focus:outline-none cursor-pointer ${
                            item.status === "Accepted" || item.status === "Enrolled"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : item.status === "Submitted"
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}
                        >
                          {uniStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={u.websiteUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-xl"
                          title="Portal"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => onRemoveSavedUni(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scholarships Tracker */}
      {activeSubTab === "scholarships" && (
        <div className="space-y-4">
          {savedScholarships.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              No scholarships tracked yet. Explore the <strong>Scholarship Hub</strong> tab to discover and track eligible grants.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedScholarships.map((item) => {
                const s = item.scholarship;
                if (!s) return null;

                const isEditingThisNotes = editingNotesId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-amber-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    {/* Left Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        <h3 className="font-bold text-base text-slate-900">{s.title}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {s.provider}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>💰 Value: {formatMoney(s.amountUsdValue, "USD", { suffix: "/yr" })}</span>
                        <span>💵 Type: {s.coverageType}</span>
                        <span>📅 Deadline: {s.deadline}</span>
                      </div>

                      {/* Notes Box */}
                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-xs text-amber-900 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-amber-800 text-[10px] uppercase">Scholarship Checklist & Notes:</span>
                          {!isEditingThisNotes && (
                            <button
                              onClick={() => {
                                setEditingNotesId(item.id);
                                setTempNotes(item.notes || "");
                              }}
                              className="text-[11px] text-amber-800 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Edit3 className="h-3 w-3" /> Edit Notes
                            </button>
                          )}
                        </div>

                        {isEditingThisNotes ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="w-full p-2 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            <button
                              onClick={async () => {
                                await onUpdateSavedScholarshipStatus(item.id, item.status, tempNotes);
                                setEditingNotesId(null);
                              }}
                              className="px-3 py-1 bg-amber-500 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" /> Save Notes
                            </button>
                          </div>
                        ) : (
                          <p className="italic text-slate-700">
                            {item.notes ? item.notes : "No custom notes written yet."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                        <select
                          value={item.status}
                          onChange={(e) => handleScholarshipStatusChange(item.id, e.target.value)}
                          className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border focus:outline-none cursor-pointer ${
                            item.status === "Awarded"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : item.status === "Docs Submitted"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}
                        >
                          {scholarshipStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-xl"
                          title="Portal"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => onRemoveSavedScholarship(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
