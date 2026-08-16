"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  Loader2,
  Play,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FlaskConical,
} from "lucide-react";

interface ResearchAgentProps {
  adminProfileId: number;
}

interface UniOption {
  id: number;
  name: string;
  country: string;
}

interface RunProgress {
  runId: string;
  universityId: number | null;
  state: string;
  progress: string[];
  error?: string;
  report: any | null;
}

const SCOPES = [
  "university",
  "programs",
  "requirements",
  "tuition",
  "living_costs",
  "application_cycles",
  "scholarships",
  "sources",
];

export function ResearchAgent({ adminProfileId }: ResearchAgentProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniOption[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [scopes, setScopes] = useState<string[]>([...SCOPES]);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RunProgress | null>(null);
  const [error, setError] = useState("");

  const searchUnis = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/universities?search=${encodeURIComponent(q)}&sort=name_asc`);
      const data = await res.json();
      if (res.ok && data.universities) setResults(data.universities.slice(0, 10));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleScope = (s: string) => {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const runResearch = async () => {
    if (!selected) {
      setError("Select a university first");
      return;
    }
    setError("");
    setRunning(true);
    setRun(null);
    try {
      const res = await fetch("/api/admin/research-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, universityId: selected, scopes, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      pollRun(data.runId);
    } catch (err: any) {
      setError(err.message || "Failed to start");
      setRunning(false);
    }
  };

  const pollRun = (runId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/admin/research-agent/status?adminProfileId=${adminProfileId}&runId=${runId}`);
        const data = await res.json();
        if (res.ok && data.run) {
          setRun(data.run);
          if (data.run.state === "running") {
            setTimeout(tick, 1500);
          } else {
            setRunning(false);
          }
        } else {
          setRunning(false);
        }
      } catch (err) {
        console.error(err);
        setRunning(false);
      }
    };
    tick();
  };

  const report = run?.report;
  const updatedCount = report?.updatedFields?.length ?? 0;
  const insertedCount =
    (report?.insertedPrograms?.length ?? 0) +
    (report?.insertedCycles?.length ?? 0) +
    (report?.insertedScholarships?.length ?? 0);
  const skippedCount = report?.skippedFields?.length ?? 0;
  const reviewCount = report?.reviewRequired?.length ?? 0;
  const rejectedCount = report?.rejectedSources?.length ?? 0;
  const discoveryOnlyCount = report?.discoveryOnly?.length ?? 0;
  const errorCount = report?.errors?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Bot className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Research Agent</h2>
          <p className="text-xs text-slate-500">
            Researches universities from official web sources and enriches the database — safe, evidence-based, never overwrites verified data.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>
      )}

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">University</label>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => searchUnis(e.target.value)}
              placeholder="Search university by name… (e.g. MIT)"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {results.length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelected(u.id);
                    setSelectedName(u.name);
                    setResults([]);
                    setQuery(u.name);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs hover:bg-indigo-50 transition-colors ${selected === u.id ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-700"}`}
                >
                  {u.name} <span className="text-slate-400">· {u.country}</span>
                </button>
              ))}
            </div>
          )}
          {selectedName && (
            <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3 inline mr-1" /> Selected: {selectedName} (id {selected})
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Scopes</label>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button
                key={s}
                onClick={() => toggleScope(s)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold border transition-colors ${
                  scopes.includes(s)
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <FlaskConical className="h-3.5 w-3.5 text-indigo-500" />
          Dry run (report only — no database writes)
        </label>

        <button
          onClick={runResearch}
          disabled={running || !selected}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Researching…" : "Run Research"}
        </button>
      </div>

      {/* Live progress */}
      {run && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${run.state === "running" ? "animate-spin" : ""}`} />
            Live Progress
            {run.state === "complete" && <span className="text-emerald-600">· Complete</span>}
            {run.state === "error" && <span className="text-red-600">· Error</span>}
          </div>
          <div className="p-4 space-y-1 max-h-56 overflow-y-auto">
            {run.progress.map((p, i) => (
              <p key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                {p.includes("Error") ? (
                  <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                ) : p.includes("WARNING") || p.includes("review") ? (
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                )}
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Final report */}
      {report && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Audit Report — {report.universityName} {report.dryRun ? "(dry run)" : ""}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: "Updated", value: updatedCount, cls: "text-indigo-700" },
                { label: "Inserted", value: insertedCount, cls: "text-emerald-700" },
                { label: "Skipped", value: skippedCount, cls: "text-slate-500" },
                { label: "Review req.", value: reviewCount, cls: "text-amber-700" },
                { label: "Rejected", value: rejectedCount, cls: "text-red-700" },
                { label: "Discovery-only", value: discoveryOnlyCount, cls: "text-slate-400" },
                { label: "Errors", value: errorCount, cls: "text-red-700" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <p className={`text-xl font-extrabold ${s.cls}`}>{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {report.updatedFields.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Updated fields ({report.updatedFields.length})</p>
                <div className="space-y-1.5">
                  {report.updatedFields.map((f: any, i: number) => (
                    <div key={i} className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-indigo-700">{f.entity ? `${f.entity}.` : ""}{f.field}</span>
                        <span className="text-[9px] font-black uppercase tracking-wide text-indigo-500">{f.action}</span>
                        {f.confidence != null && (
                          <span className="ml-auto text-[10px] text-slate-500">confidence {(Number(f.confidence) * 100).toFixed(0)}%</span>
                        )}
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        {String(f.dbValue ?? "NULL")}{f.currency ? ` ${f.currency}` : ""} → {String(f.newValue ?? "NULL")}{f.currency ? ` ${f.currency}` : ""}
                      </p>
                      {f.sourceUrl && (
                        <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:underline truncate mt-0.5">
                          {f.sourceTitle || f.sourceUrl}
                        </a>
                      )}
                      {f.reason && <p className="text-slate-400 mt-0.5">{f.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.skippedFields.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Skipped / unchanged ({report.skippedFields.length})</p>
                <div className="space-y-1">
                  {report.skippedFields.map((s: any, i: number) => (
                    <p key={i} className="text-[11px] text-slate-500">
                      {typeof s === "string" ? s : (
                        <>
                          <b className="text-slate-600">{s.entity ? `${s.entity}.` : ""}{s.field}</b>{" "}
                          {String(s.dbValue ?? "NULL")}{s.currency ? ` ${s.currency}` : ""} → {String(s.newValue ?? "NULL")}{s.currency ? ` ${s.currency}` : ""} — {s.reason}
                        </>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {report.insertedPrograms.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Programs</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.insertedPrograms.map((p: string) => (
                    <span key={p} className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {report.reviewRequired.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Review required</p>
                {report.reviewRequired.map((r: any, i: number) => (
                  <p key={i} className="text-[11px] text-amber-700">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    {typeof r === "string" ? r : `${r.field} — ${r.reason || "manual check needed"}`}
                  </p>
                ))}
              </div>
            )}
            {report.rejectedSources?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rejected sources ({report.rejectedSources.length})</p>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {report.rejectedSources.slice(0, 30).map((s: any, i: number) => (
                    <p key={i} className="text-[10px] text-red-500 truncate">
                      <XCircle className="h-3 w-3 inline mr-1" />{s.url} <span className="text-red-300">({s.reason})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
            {report.newSources.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Persisted sources ({report.newSources.length})</p>
                {report.newSources.slice(0, 15).map((s: any) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-indigo-600 hover:underline truncate">
                    {s.title || s.url}
                  </a>
                ))}
              </div>
            )}
            {report.discoveryOnly?.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Discovery-only pages ({report.discoveryOnly.length}) — crawled, NOT persisted</p>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {report.discoveryOnly.slice(0, 20).map((s: any, i: number) => (
                    <p key={i} className="text-[10px] text-slate-400 truncate">
                      {s.url} <span className="text-slate-300">({s.reason})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
