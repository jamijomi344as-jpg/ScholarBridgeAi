"use client";

import React, { useEffect, useState } from "react";
import {
  Crown,
  Gift,
  RefreshCw,
  Loader2,
  ShieldCheck,
  UserX,
  CheckCircle2,
} from "lucide-react";

interface PremiumManagerProps {
  adminProfileId: number;
}

interface AdminProfileRow {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
  isPremium: boolean;
  premiumUntil: string | null;
  [key: string]: any;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500";

export function PremiumManager({ adminProfileId }: PremiumManagerProps) {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProfiles = async () => {
    try {
      const res = await fetch(`/api/admin/profiles?adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch profiles");
      setProfiles(data.profiles || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const giftByEmail = async (recipientEmail: string) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminProfileId,
          email: recipientEmail.trim(),
          days: Number(days) || 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant premium");
      setSuccess(
        `Premium gifted to ${data.profile?.name || data.profile?.email || "student"} until ${new Date(
          data.subscription.currentPeriodEnd
        ).toLocaleDateString()}.`
      );
      setEmail("");
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || "Failed to grant premium");
    } finally {
      setSaving(false);
    }
  };

  const handleGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter a student email to gift premium.");
      return;
    }
    await giftByEmail(email);
  };

  /** Gift directly by profile id — immune to email case/spacing mismatches. */
  const handleGiftProfile = async (p: AdminProfileRow) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminProfileId,
          profileId: p.id,
          days: Number(days) || 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant premium");
      setSuccess(
        `Premium gifted to ${data.profile?.name || data.profile?.email || "student"} until ${new Date(
          data.subscription.currentPeriodEnd
        ).toLocaleDateString()}.`
      );
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || "Failed to grant premium");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (p: AdminProfileRow) => {
    if (!window.confirm(`Revoke premium access for ${p.name} (${p.email})?`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/admin/premium?adminProfileId=${adminProfileId}&profileId=${p.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke premium");
      setSuccess("Premium access revoked.");
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || "Failed to revoke premium");
    }
  };

  const premiumCount = profiles.filter((p) => p.isPremium).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
          <Crown className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Premium Manager</h2>
          <p className="text-xs text-slate-500">
            {premiumCount} of {profiles.length} students have active premium
          </p>
        </div>
        <button
          onClick={fetchProfiles}
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

      {/* Gift form */}
      <form
        onSubmit={handleGift}
        className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-xs space-y-3"
      >
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-extrabold text-slate-800">Give Premium as a Gift</h3>
        </div>
        <p className="text-xs text-slate-500">
          Grant a student immediate premium access for a chosen number of days — free of charge.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Student Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="student@scholarbridge.edu"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Days
            </label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={inputCls}
              placeholder="30"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
          Gift Premium
        </button>
      </form>

      {/* Student list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          All Students ({profiles.length})
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
          </div>
        ) : profiles.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">
            No student profiles found.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-extrabold ${
                    p.isPremium
                      ? "bg-amber-100 text-amber-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-slate-800">{p.name}</span>
                    {p.isPremium && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Crown className="h-3 w-3" /> Premium
                      </span>
                    )}
                    {p.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {p.email}
                    {p.isPremium && p.premiumUntil && (
                      <span className="text-amber-600">
                        {" "}· until {new Date(p.premiumUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {p.isPremium ? (
                  <button
                    onClick={() => handleRevoke(p)}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                  >
                    <UserX className="h-3 w-3" /> Revoke
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGiftProfile(p)}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                      title={`Gift ${days} days of premium to ${p.name}`}
                    >
                      <Gift className="h-3 w-3" /> Gift
                    </button>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <CheckCircle2 className="h-3 w-3" /> No premium
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
