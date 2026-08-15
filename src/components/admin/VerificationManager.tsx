"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Loader2, RefreshCw, ExternalLink, CheckCircle2 } from "lucide-react";

interface VerificationManagerProps {
  adminProfileId: number;
}

interface VerifyRow {
  id: number;
  title: string;
  provider?: string;
  country?: string;
  sourceUrl: string | null;
  websiteUrl: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: string;
}

export function VerificationManager({ adminProfileId }: VerificationManagerProps) {
  const [scholarships, setScholarships] = useState<VerifyRow[]>([]);
  const [universities, setUniversities] = useState<VerifyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("unverified");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (st = status) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verify?adminProfileId=${adminProfileId}&status=${st}`);
      const data = await res.json();
      if (res.ok) {
        setScholarships(data.scholarships || []);
        setUniversities(data.universities || []);
      }
    } catch (err) {
      console.error("Failed to load verification queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const verify = async (entityType: "scholarship" | "university", id: number, sourceUrl: string) => {
    setBusyId(`${entityType}-${id}`);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, entityType, id, sourceUrl: sourceUrl || null }),
      });
      if (res.ok) {
        if (entityType === "scholarship") setScholarships((prev) => prev.filter((r) => r.id !== id));
        else setUniversities((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const renderRow = (r: VerifyRow, entityType: "scholarship" | "university") => {
    const source = r.sourceUrl || r.websiteUrl;
    return (
      <li key={`${entityType}-${r.id}`} className="border-b border-slate-100 last:border-0 px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">{r.title}</p>
            <p className="text-[11px] text-slate-500">
              {r.provider || r.country || ""} · #{r.id}
            </p>
            {source && (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline mt-0.5"
              >
                <ExternalLink className="h-2.5 w-2.5" /> {source.slice(0, 60)}…
              </a>
            )}
          </div>
          <button
            onClick={() => verify(entityType, r.id, source || "")}
            disabled={busyId === `${entityType}-${r.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busyId === `${entityType}-${r.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Mark verified
          </button>
        </div>
      </li>
    );
  };

  const total = scholarships.length + universities.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Source Verification</h2>
          <p className="text-xs text-slate-500">
            Review unverified records and mark them verified with their official source. Never present unverified data as verified.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              load(e.target.value);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
          >
            <option value="unverified">Unverified ({total})</option>
            <option value="needs_verification">Needs verification</option>
            <option value="verified">Verified</option>
            <option value="recently_verified">Recently verified</option>
          </select>
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-xs font-semibold text-slate-500">
            {status === "unverified"
              ? "No unverified records — everything has been reviewed."
              : `No records with status "${status}".`}
          </p>
        </div>
      ) : (
        <>
          {universities.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Universities ({universities.length})
              </div>
              <ul>{universities.map((r) => renderRow(r, "university"))}</ul>
            </div>
          )}
          {scholarships.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Scholarships ({scholarships.length})
              </div>
              <ul>{scholarships.map((r) => renderRow(r, "scholarship"))}</ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
