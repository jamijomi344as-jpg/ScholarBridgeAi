"use client";

import React, { useState } from "react";
import { StudentProfile } from "./Navbar";
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Bot, 
  Send, 
  Award, 
  HelpCircle,
  Zap,
  BookOpen
} from "lucide-react";

interface AiSopStudioProps {
  activeProfile: StudentProfile | null;
}

export function AiSopStudio({ activeProfile }: AiSopStudioProps) {
  const [activeTab, setActiveTab] = useState<"drafter" | "reviewer">("drafter");

  // Drafter State
  const [targetUni, setTargetUni] = useState("");
  const [targetProgram, setTargetProgram] = useState(activeProfile?.targetMajor || "Computer Science");
  const [personalHook, setPersonalHook] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [generatedSop, setGeneratedSop] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);

  // Reviewer State
  const [existingDraft, setExistingDraft] = useState("");
  const [reviewUni, setReviewUni] = useState("");
  const [sopReview, setSopReview] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  const handleGenerateSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setIsDrafting(true);
    setGeneratedSop(null);

    try {
      const res = await fetch("/api/ai/draft-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          universityName: targetUni,
          programName: targetProgram,
          personalHook,
          careerGoals,
        }),
      });
      const data = await res.json();
      if (data.sopDraft) {
        setGeneratedSop(data.sopDraft);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleReviewSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingDraft) return;
    setIsReviewing(true);
    setSopReview(null);

    try {
      const res = await fetch("/api/ai/review-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sopText: existingDraft,
          targetUniversity: reviewUni,
          targetMajor: activeProfile?.targetMajor,
        }),
      });
      const data = await res.json();
      if (data.review) {
        setSopReview(data.review);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReviewing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            AI SOP & Application Essay Suite
          </div>
          <h1 className="text-xl font-bold text-slate-900">Statement of Purpose & Essay Studio</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate tailored SOP drafts or evaluate existing essays against elite admissions committee standards.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("drafter")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "drafter" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ✍️ AI SOP Drafter
          </button>
          <button
            onClick={() => setActiveTab("reviewer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "reviewer" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔍 AI Essay Reviewer
          </button>
        </div>
      </div>

      {/* DRAFTER MODE */}
      {activeTab === "drafter" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              Application SOP Inputs
            </h3>

            <form onSubmit={handleGenerateSop} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target University Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical University of Munich"
                  value={targetUni}
                  onChange={(e) => setTargetUni(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Degree Program</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M.Sc. Data Engineering and Analytics"
                  value={targetProgram}
                  onChange={(e) => setTargetProgram(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal Inspiration / Academic Hook</label>
                <textarea
                  rows={3}
                  placeholder="e.g. During my undergraduate capstone, I optimized distributed database queries, cutting execution time by 40%..."
                  value={personalHook}
                  onChange={(e) => setPersonalHook(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Post-Graduation Career Ambitions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Work as Lead Machine Learning Architect in cloud infrastructure..."
                  value={careerGoals}
                  onChange={(e) => setCareerGoals(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">Auto-Included Profile Context:</span>
                <p>GPA: {activeProfile?.gpa}/{activeProfile?.gpaScale} • Test: IELTS {activeProfile?.ieltsScore || "7.5"} • {activeProfile?.researchPublications || 0} Pubs • {activeProfile?.workExperienceYears || 0} yrs Exp</p>
              </div>

              <button
                type="submit"
                disabled={isDrafting}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <Bot className="h-4 w-4" />
                {isDrafting ? "Drafting SOP with AI..." : "Generate 5-Paragraph SOP Draft"}
              </button>
            </form>
          </div>

          {/* Right Draft Output */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[500px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Generated Statement of Purpose
                </h3>

                {generatedSop && (
                  <button
                    onClick={() => copyToClipboard(generatedSop)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Text"}
                  </button>
                )}
              </div>

              {generatedSop ? (
                <div className="prose prose-indigo max-w-none text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto pr-2">
                  {generatedSop}
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-3">
                  <Sparkles className="h-10 w-10 text-indigo-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    Fill out the target university details on the left and click "Generate SOP Draft" to build a customized statement.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWER MODE */}
      {activeTab === "reviewer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Text Area */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Paste Existing Draft SOP / Personal Statement
            </h3>

            <form onSubmit={handleReviewSop} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target University (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University or Oxford"
                  value={reviewUni}
                  onChange={(e) => setReviewUni(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paste Your Full SOP Text</label>
                <textarea
                  rows={12}
                  required
                  placeholder="Paste your paragraph text here..."
                  value={existingDraft}
                  onChange={(e) => setExistingDraft(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Word Count: {existingDraft.trim().split(/\s+/).filter(Boolean).length} words</p>
              </div>

              <button
                type="submit"
                disabled={isReviewing || !existingDraft}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <Bot className="h-4 w-4" />
                {isReviewing ? "Evaluating SOP with AI..." : "Evaluate & Diagnose Essay"}
              </button>
            </form>
          </div>

          {/* Right Review Feedback Output */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs min-h-[500px]">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
              AI Diagnostic Evaluation & Rewrite Suggestions
            </h3>

            {sopReview ? (
              <div className="prose prose-indigo max-w-none text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto pr-2">
                {sopReview}
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-3">
                <Bot className="h-10 w-10 text-purple-300" />
                <p className="text-xs font-semibold text-slate-600">
                  Paste your essay draft on the left and click "Evaluate" to receive detailed scoring and line-by-line sentence improvements.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
