"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface UniversitiesManagerProps {
  adminProfileId: number;
}

interface UniversityRow {
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
  minSat: number | null;
  acceptanceRate: number;
  postStudyWorkVisaYears: number;
  description: string;
  highlights: string;
  websiteUrl: string;
  imageUrl: string;
}

interface UniversityForm {
  name: string;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: string;
  degreeLevel: string;
  programMajor: string;
  annualTuitionUsd: string;
  annualLivingEstUsd: string;
  minGpa: string;
  minIelts: string;
  minSat: string;
  acceptanceRate: string;
  postStudyWorkVisaYears: string;
  description: string;
  highlights: string;
  websiteUrl: string;
  imageUrl: string;
}

const emptyForm: UniversityForm = {
  name: "",
  country: "",
  city: "",
  flagEmoji: "🌐",
  worldRanking: "",
  degreeLevel: "All",
  programMajor: "",
  annualTuitionUsd: "",
  annualLivingEstUsd: "",
  minGpa: "3.0",
  minIelts: "6.5",
  minSat: "",
  acceptanceRate: "",
  postStudyWorkVisaYears: "2.0",
  description: "",
  highlights: "[]",
  websiteUrl: "",
  imageUrl: "",
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function UniversitiesManager({ adminProfileId }: UniversitiesManagerProps) {
  const [universities, setUniversities] = useState<UniversityRow[]>([]);
  const [form, setForm] = useState<UniversityForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUniversities = async () => {
    try {
      const res = await fetch("/api/universities");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch universities");
      setUniversities(data.universities || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch universities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  const setField = (key: keyof UniversityForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const startEdit = (u: UniversityRow) => {
    setEditingId(u.id);
    setForm({
      name: u.name,
      country: u.country,
      city: u.city,
      flagEmoji: u.flagEmoji,
      worldRanking: String(u.worldRanking),
      degreeLevel: u.degreeLevel,
      programMajor: u.programMajor,
      annualTuitionUsd: String(u.annualTuitionUsd),
      annualLivingEstUsd: String(u.annualLivingEstUsd),
      minGpa: String(u.minGpa),
      minIelts: String(u.minIelts),
      minSat: u.minSat == null ? "" : String(u.minSat),
      acceptanceRate: String(u.acceptanceRate),
      postStudyWorkVisaYears: String(u.postStudyWorkVisaYears),
      description: u.description,
      highlights: u.highlights,
      websiteUrl: u.websiteUrl,
      imageUrl: u.imageUrl,
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = { adminProfileId, university: form };
      const res = editingId
        ? await fetch("/api/admin/universities", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, id: editingId }),
          })
        : await fetch("/api/admin/universities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save university");
      setSuccess(editingId ? "University updated." : "University created.");
      cancelEdit();
      await fetchUniversities();
    } catch (err: any) {
      setError(err.message || "Failed to save university");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UniversityRow) => {
    if (!window.confirm(`Delete "${u.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(
        `/api/admin/universities?id=${u.id}&adminProfileId=${adminProfileId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete university");
      setSuccess("University deleted.");
      await fetchUniversities();
    } catch (err: any) {
      setError(err.message || "Failed to delete university");
    }
  };

  const fields: { key: keyof UniversityForm; label: string; type?: string; full?: boolean; placeholder?: string }[] = [
    { key: "name", label: "University Name", full: true },
    { key: "country", label: "Country" },
    { key: "city", label: "City" },
    { key: "flagEmoji", label: "Flag Emoji", placeholder: "🇺🇸" },
    { key: "worldRanking", label: "World Ranking", type: "number" },
    { key: "degreeLevel", label: "Degree Level", placeholder: "All / Bachelor / Master / PhD" },
    { key: "programMajor", label: "Program / Major", full: true },
    { key: "annualTuitionUsd", label: "Annual Tuition (USD)", type: "number" },
    { key: "annualLivingEstUsd", label: "Annual Living Est. (USD)", type: "number" },
    { key: "minGpa", label: "Min GPA", type: "number", placeholder: "3.0" },
    { key: "minIelts", label: "Min IELTS", type: "number", placeholder: "6.5" },
    { key: "minSat", label: "Min SAT (optional)", type: "number" },
    { key: "acceptanceRate", label: "Acceptance Rate (%)", type: "number" },
    { key: "postStudyWorkVisaYears", label: "Post-Study Work Visa (years)", type: "number" },
    { key: "highlights", label: "Highlights (JSON array)", full: true, placeholder: '["Research intensive", "Top 100"]' },
    { key: "websiteUrl", label: "Website URL", full: true },
    { key: "imageUrl", label: "Image URL", full: true },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Universities Manager</h2>
          <p className="text-xs text-slate-500">
            {universities.length} universit{universities.length === 1 ? "y" : "ies"} on the platform
          </p>
        </div>
        <button
          onClick={fetchUniversities}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {success}
        </div>
      )}

      {/* Add / Edit form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2">
          {editingId ? (
            <Pencil className="h-4 w-4 text-indigo-600" />
          ) : (
            <Plus className="h-4 w-4 text-indigo-600" />
          )}
          <h3 className="text-sm font-extrabold text-slate-800">
            {editingId ? "Edit University" : "Add University"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map((f) => (
            <div key={f.key} className={f.full ? "sm:col-span-2 lg:col-span-3" : ""}>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                {f.label}
              </label>
              <input
                type={f.type || "text"}
                value={form[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setField(f.key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {editingId ? "Save Changes" : "Add University"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading universities…
          </div>
        ) : universities.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">
            No universities yet — add the first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">University</th>
                  <th className="px-4 py-3 font-bold">Country</th>
                  <th className="px-4 py-3 font-bold">Ranking</th>
                  <th className="px-4 py-3 font-bold">Tuition (USD)</th>
                  <th className="px-4 py-3 font-bold">Acceptance</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {universities.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">
                        {u.flagEmoji} {u.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{u.city} · {u.programMajor}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.country}</td>
                    <td className="px-4 py-3 text-slate-600">#{u.worldRanking}</td>
                    <td className="px-4 py-3 text-slate-600">${u.annualTuitionUsd.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{u.acceptanceRate}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(u)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
