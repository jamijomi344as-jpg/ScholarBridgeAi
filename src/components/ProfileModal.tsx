"use client";

import React, { useState, useEffect } from "react";
import { StudentProfile } from "./Navbar";
import { X, Save, Sparkles, DollarSign, BookOpen, Globe, Award } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  isNew: boolean;
  onClose: () => void;
  profile: StudentProfile | null;
  onSave: (data: Partial<StudentProfile>) => Promise<void>;
}

export function ProfileModal({ isOpen, isNew, onClose, profile, onSave }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    degreeLevel: "Master",
    targetMajor: "Computer Science",
    gpa: 3.6,
    gpaScale: 4.0,
    ieltsScore: 7.5,
    toeflScore: 100,
    satScore: 1400,
    greScore: 315,
    budgetAnnualUsd: 25000,
    preferredCountries: ["United States", "United Kingdom", "Canada", "Germany"],
    needScholarship: true,
    extracurriculars: "",
    workExperienceYears: 1,
    researchPublications: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (profile && !isNew) {
      let countries: string[] = ["United States", "United Kingdom", "Canada"];
      try {
        if (typeof profile.preferredCountries === "string") {
          countries = JSON.parse(profile.preferredCountries);
        } else if (Array.isArray(profile.preferredCountries)) {
          countries = profile.preferredCountries;
        }
      } catch {
        // fallback
      }

      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        degreeLevel: profile.degreeLevel || "Master",
        targetMajor: profile.targetMajor || "Computer Science",
        gpa: profile.gpa || 3.5,
        gpaScale: profile.gpaScale || 4.0,
        ieltsScore: profile.ieltsScore ?? 7.0,
        toeflScore: profile.toeflScore ?? 95,
        satScore: profile.satScore ?? 1350,
        greScore: profile.greScore ?? 315,
        budgetAnnualUsd: profile.budgetAnnualUsd || 25000,
        preferredCountries: countries,
        needScholarship: profile.needScholarship ?? true,
        extracurriculars: profile.extracurriculars || "",
        workExperienceYears: profile.workExperienceYears || 0,
        researchPublications: profile.researchPublications || 0,
      });
    } else if (isNew) {
      setFormData({
        name: "New Student",
        email: "student@university.edu",
        degreeLevel: "Master",
        targetMajor: "Data Science & AI",
        gpa: 3.5,
        gpaScale: 4.0,
        ieltsScore: 7.0,
        toeflScore: 95,
        satScore: 1350,
        greScore: 315,
        budgetAnnualUsd: 20000,
        preferredCountries: ["United States", "Canada", "Germany", "United Kingdom"],
        needScholarship: true,
        extracurriculars: "Student Council, Programming Club, Open Source Contributor",
        workExperienceYears: 1,
        researchPublications: 0,
      });
    }
  }, [profile, isNew, isOpen]);

  // Clear any previous error each time the modal opens.
  useEffect(() => {
    if (isOpen) setErrorMsg("");
  }, [isOpen]);

  if (!isOpen) return null;

  const countryOptions = [
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
  ];

  const handleCountryToggle = (country: string) => {
    setFormData((prev) => {
      const exists = prev.preferredCountries.includes(country);
      if (exists) {
        return {
          ...prev,
          preferredCountries: prev.preferredCountries.filter((c) => c !== country),
        };
      } else {
        return {
          ...prev,
          preferredCountries: [...prev.preferredCountries, country],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onSave({
        ...formData,
        preferredCountries: JSON.stringify(formData.preferredCountries),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Saqlashda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Sparkles className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{isNew ? "Create Student Profile" : "Edit Academic Profile"}</h2>
              <p className="text-xs text-indigo-100">ScholarBridge AI matching engine calculates recommendations using these metrics.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}
          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Alex Chen"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="alex@university.edu"
                />
              </div>
            </div>
          </div>

          {/* Academic Profile */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-indigo-600" />
              Academic Credentials & Standardized Scores
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Degree</label>
                <select
                  value={formData.degreeLevel}
                  onChange={(e) => setFormData({ ...formData, degreeLevel: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Bachelor">Bachelor (Undergrad)</option>
                  <option value="Master">Master (MS / MA)</option>
                  <option value="PhD">Doctorate (PhD)</option>
                  <option value="Diploma">Diploma / Post-grad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Major / Field</label>
                <input
                  type="text"
                  required
                  value={formData.targetMajor}
                  onChange={(e) => setFormData({ ...formData, targetMajor: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Computer Science"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GPA & Scale</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formData.gpa}
                    onChange={(e) => setFormData({ ...formData, gpa: parseFloat(e.target.value) || 0 })}
                    className="w-2/3 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <select
                    value={formData.gpaScale}
                    onChange={(e) => setFormData({ ...formData, gpaScale: parseFloat(e.target.value) })}
                    className="w-1/3 px-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={4.0}>/ 4.0</option>
                    <option value={5.0}>/ 5.0</option>
                    <option value={10.0}>/ 10.0</option>
                    <option value={100}>/ 100</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Test Scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">IELTS Score</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="9.0"
                  value={formData.ieltsScore || ""}
                  onChange={(e) => setFormData({ ...formData, ieltsScore: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 7.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">TOEFL iBT</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={formData.toeflScore || ""}
                  onChange={(e) => setFormData({ ...formData, toeflScore: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">SAT Score</label>
                <input
                  type="number"
                  min="400"
                  max="1600"
                  value={formData.satScore || ""}
                  onChange={(e) => setFormData({ ...formData, satScore: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 1420"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">GRE General</label>
                <input
                  type="number"
                  min="260"
                  max="340"
                  value={formData.greScore || ""}
                  onChange={(e) => setFormData({ ...formData, greScore: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 320"
                />
              </div>
            </div>
          </div>

          {/* Financials & Preferences */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              Budget Constraints & Financial Aid
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Annual Budget Limit (Tuition + Living)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={formData.budgetAnnualUsd}
                    onChange={(e) => setFormData({ ...formData, budgetAnnualUsd: parseInt(e.target.value, 10) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Current: ${formData.budgetAnnualUsd?.toLocaleString()}/year
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needScholarship}
                    onChange={(e) => setFormData({ ...formData, needScholarship: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Requires Full/Partial Scholarships</span>
                    <p className="text-[11px] text-slate-500">Prioritizes universities with financial aid & grant funds</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Preferred Countries */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              Preferred Study Destinations
            </h3>
            <div className="flex flex-wrap gap-2">
              {countryOptions.map((country) => {
                const selected = formData.preferredCountries.includes(country);
                return (
                  <button
                    type="button"
                    key={country}
                    onClick={() => handleCountryToggle(country)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {selected ? "✓ " : "+ "}
                    {country}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Research & Experience */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Research & Extracurricular Highlights
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work/Internship Experience</label>
                <select
                  value={formData.workExperienceYears}
                  onChange={(e) => setFormData({ ...formData, workExperienceYears: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={0}>0 Years (Fresh Graduate)</option>
                  <option value={1}>1 Year</option>
                  <option value={2}>2 Years</option>
                  <option value={3}>3+ Years</option>
                  <option value={5}>5+ Years Senior</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Research Papers / Publications</label>
                <input
                  type="number"
                  min="0"
                  value={formData.researchPublications}
                  onChange={(e) => setFormData({ ...formData, researchPublications: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Extracurriculars & Achievements</label>
              <textarea
                rows={2}
                value={formData.extracurriculars}
                onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. Hackathon winner, Vice President of Tech Club, Peer Tutor in Data Structures..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-200 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving Profile..." : isNew ? "Create Profile" : "Save Profile Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
