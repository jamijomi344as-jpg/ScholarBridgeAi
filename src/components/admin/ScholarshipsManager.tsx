"use client";

import React, { useEffect, useState } from "react";
import {
  Award,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ScholarshipsManagerProps {
  adminProfileId: number;
}

interface ScholarshipRow {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: number;
  deadline: string;
  degreeLevels: string;
  eligibleMajors: string;
  minGpa: number | null;
  minIelts: number | null;
  financialNeedBased: boolean;
  meritBased: boolean;
  description: string;
  requirements: string;
  websiteUrl: string;
  // Dynamic lifecycle (spec §4)
  deadlineType?: string;
  deadlineDate?: string | null;
  openingDate?: string | null;
  recurrence?: string;
  expectedDeadlinePeriod?: string | null;
  applicationUrl?: string | null;
  sourceUrl?: string | null;
  verificationStatus?: string;
  eligibleCountries?: string;
  requiredDocuments?: string;
}

interface ScholarshipForm {
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: string;
  deadline: string;
  degreeLevels: string;
  eligibleMajors: string;
  minGpa: string;
  minIelts: string;
  financialNeedBased: boolean;
  meritBased: boolean;
  description: string;
  requirements: string;
  websiteUrl: string;
  // Dynamic lifecycle (spec §4)
  deadlineType: string;
  deadlineDate: string;
  openingDate: string;
  recurrence: string;
  expectedDeadlinePeriod: string;
  applicationUrl: string;
  sourceUrl: string;
  verificationStatus: string;
  eligibleCountries: string;
  requiredDocuments: string;
}

const emptyForm: ScholarshipForm = {
  title: "",
  provider: "",
  country: "",
  coverageType: "Full Tuition + Stipend",
  amountUsdValue: "",
  deadline: "",
  degreeLevels: '["Master","PhD"]',
  eligibleMajors: '["All"]',
  minGpa: "",
  minIelts: "",
  financialNeedBased: false,
  meritBased: true,
  description: "",
  requirements: "",
  websiteUrl: "",
  deadlineType: "unknown",
  deadlineDate: "",
  openingDate: "",
  recurrence: "none",
  expectedDeadlinePeriod: "",
  applicationUrl: "",
  sourceUrl: "",
  verificationStatus: "unverified",
  eligibleCountries: "[]",
  requiredDocuments: "[]",
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function ScholarshipsManager({ adminProfileId }: ScholarshipsManagerProps) {
  const [scholarships, setScholarships] = useState<ScholarshipRow[]>([]);
  const [form, setForm] = useState<ScholarshipForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchScholarships = async () => {
    try {
      const res = await fetch("/api/scholarships");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch scholarships");
      setScholarships(data.scholarships || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch scholarships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
  }, []);

  const setField = <K extends keyof ScholarshipForm>(key: K, value: ScholarshipForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const startEdit = (s: ScholarshipRow) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      provider: s.provider,
      country: s.country,
      coverageType: s.coverageType,
      amountUsdValue: String(s.amountUsdValue),
      deadline: s.deadline,
      degreeLevels: s.degreeLevels,
      eligibleMajors: s.eligibleMajors,
      minGpa: s.minGpa == null ? "" : String(s.minGpa),
      minIelts: s.minIelts == null ? "" : String(s.minIelts),
      financialNeedBased: s.financialNeedBased,
      meritBased: s.meritBased,
      description: s.description,
      requirements: s.requirements,
      websiteUrl: s.websiteUrl,
      deadlineType: s.deadlineType || "unknown",
      deadlineDate: s.deadlineDate ? String(s.deadlineDate).slice(0, 10) : "",
      openingDate: s.openingDate ? String(s.openingDate).slice(0, 10) : "",
      recurrence: s.recurrence || "none",
      expectedDeadlinePeriod: s.expectedDeadlinePeriod || "",
      applicationUrl: s.applicationUrl || "",
      sourceUrl: s.sourceUrl || "",
      verificationStatus: s.verificationStatus || "unverified",
      eligibleCountries: s.eligibleCountries || "[]",
      requiredDocuments: s.requiredDocuments || "[]",
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
      const payload = { adminProfileId, scholarship: form };
      const res = editingId
        ? await fetch("/api/admin/scholarships", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, id: editingId }),
          })
        : await fetch("/api/admin/scholarships", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save scholarship");
      setSuccess(editingId ? "Scholarship updated." : "Scholarship created.");
      cancelEdit();
      await fetchScholarships();
    } catch (err: any) {
      setError(err.message || "Failed to save scholarship");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: ScholarshipRow) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(
        `/api/admin/scholarships?id=${s.id}&adminProfileId=${adminProfileId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete scholarship");
      setSuccess("Scholarship deleted.");
      await fetchScholarships();
    } catch (err: any) {
      setError(err.message || "Failed to delete scholarship");
    }
  };

  const textFields: { key: keyof ScholarshipForm; label: string; type?: string; full?: boolean; placeholder?: string }[] = [
    { key: "title", label: "Scholarship Title", full: true },
    { key: "provider", label: "Provider" },
    { key: "country", label: "Country" },
    { key: "coverageType", label: "Coverage Type", placeholder: "Full Tuition + Stipend" },
    { key: "amountUsdValue", label: "Amount (USD / year)", type: "number" },
    { key: "deadline", label: "Deadline", placeholder: "e.g. 2026-12-01" },
    { key: "degreeLevels", label: "Degree Levels (JSON array)", placeholder: '["Master","PhD"]' },
    { key: "eligibleMajors", label: "Eligible Majors (JSON array)", placeholder: '["All"]' },
    { key: "minGpa", label: "Min GPA (optional)", type: "number" },
    { key: "minIelts", label: "Min IELTS (optional)", type: "number" },
    { key: "websiteUrl", label: "Website URL", full: true },
    // Dynamic lifecycle (spec §4)
    { key: "deadlineType", label: "Deadline Type", placeholder: "exact | range | rolling | not_announced | recurring | unknown" },
    { key: "deadlineDate", label: "Exact Deadline (date)", type: "date" },
    { key: "openingDate", label: "Opening Date (date)", type: "date" },
    { key: "recurrence", label: "Recurrence", placeholder: "none | annual" },
    { key: "expectedDeadlinePeriod", label: "Expected Deadline Period", placeholder: "e.g. October-December (from previous cycles)" },
    { key: "applicationUrl", label: "Application URL", full: true },
    { key: "sourceUrl", label: "Official Source URL", full: true },
    { key: "verificationStatus", label: "Verification Status", placeholder: "unverified | verified | needs_verification | recently_verified" },
    { key: "eligibleCountries", label: "Eligible Countries (JSON)", placeholder: '["All"]' },
    { key: "requiredDocuments", label: "Required Documents (JSON)", placeholder: '["transcript","recommendation_letter"]' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Award className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Scholarships Manager</h2>
          <p className="text-xs text-slate-500">
            {scholarships.length} scholarship{scholarships.length === 1 ? "" : "s"} on the platform
          </p>
        </div>
        <button
          onClick={fetchScholarships}
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
            <Pencil className="h-4 w-4 text-emerald-600" />
          ) : (
            <Plus className="h-4 w-4 text-emerald-600" />
          )}
          <h3 className="text-sm font-extrabold text-slate-800">
            {editingId ? "Edit Scholarship" : "Add Scholarship"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {textFields.map((f) => (
            <div key={f.key} className={f.full ? "sm:col-span-2 lg:col-span-3" : ""}>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                {f.label}
              </label>
              <input
                type={f.type || "text"}
                value={String(form[f.key] ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => setField(f.key, e.target.value as any)}
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
              rows={2}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Requirements
            </label>
            <textarea
              value={form.requirements}
              onChange={(e) => setField("requirements", e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.financialNeedBased}
              onChange={(e) => setField("financialNeedBased", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Financial need based
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.meritBased}
              onChange={(e) => setField("meritBased", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Merit based
          </label>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {editingId ? "Save Changes" : "Add Scholarship"}
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
            <Loader2 className="h-4 w-4 animate-spin" /> Loading scholarships…
          </div>
        ) : scholarships.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">
            No scholarships yet — add the first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">Scholarship</th>
                  <th className="px-4 py-3 font-bold">Provider</th>
                  <th className="px-4 py-3 font-bold">Country</th>
                  <th className="px-4 py-3 font-bold">Amount (USD)</th>
                  <th className="px-4 py-3 font-bold">Deadline</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scholarships.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{s.title}</div>
                      <div className="text-[11px] text-slate-500">{s.coverageType}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.provider}</td>
                    <td className="px-4 py-3 text-slate-600">{s.country}</td>
                    <td className="px-4 py-3 text-slate-600">
                      ${s.amountUsdValue.toLocaleString()}
                      {s.financialNeedBased && <span className="ml-1 text-[10px] text-emerald-600 font-bold">NEED</span>}
                      {s.meritBased && <span className="ml-1 text-[10px] text-indigo-600 font-bold">MERIT</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.deadline}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(s)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
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
