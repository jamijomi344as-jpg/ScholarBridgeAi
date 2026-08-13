"use client";

import React, { useEffect, useState } from "react";
import {
  Gift,
  Copy,
  Check,
  Link2,
  Crown,
  Users,
  Loader2,
} from "lucide-react";
import { StudentProfile } from "./Navbar";

interface ReferralProgramCardProps {
  activeProfile: StudentProfile;
}

interface ReferralStatus {
  code: string;
  link: string;
  referralPoints: number;
  nextMilestone: number;
  isPremium: boolean;
  premiumUntil: string | null;
  referredBy: number | null;
  referredUsers: {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
  }[];
}

const MILESTONE = 5;

export function ReferralProgramCard({ activeProfile }: ReferralProgramCardProps) {
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/referral?profileId=${activeProfile.id}`);
        const data = await res.json();
        if (!cancelled && res.ok && data.code) setStatus(data);
      } catch (err) {
        console.error("Failed to load referral status:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile.id]);

  const copy = async () => {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.link);
    } catch {
      const el = document.createElement("textarea");
      el.value = status.link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading && !status) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Referal ma&apos;lumotlari yuklanmoqda…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 text-xs text-slate-500">
        Referal ma&apos;lumotlarini yuklab bo&apos;lmadi.
      </div>
    );
  }

  const progressPct = Math.min(
    100,
    Math.round(((status.referralPoints % MILESTONE) / MILESTONE) * 100)
  );
  const toNext = MILESTONE - (status.referralPoints % MILESTONE);
  const activeCount = status.referredUsers.filter((u) => u.isActive).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold">Referal dasturi</h3>
            <p className="text-[11px] text-white/80">Do&apos;stlaringizni taklif qiling, Premium sovg&apos;a qiling</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Premium badge */}
        {status.isPremium && status.premiumUntil ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-700">
              Premium faol — {new Date(status.premiumUntil).toLocaleDateString()}gacha
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Crown className="h-4 w-4 text-slate-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-500">
              Premium&apos;gacha yana {toNext} ta faol do&apos;st kerak
            </p>
          </div>
        )}

        {/* Points + progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-slate-700">
              {status.referralPoints} / {MILESTONE} ball
            </p>
            <p className="text-[11px] font-semibold text-slate-400">
              {activeCount} ta faol taklif
            </p>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Har 5 ta faol do&apos;st uchun +30 kun Premium (muddatlar qo&apos;shilib boradi)
          </p>
        </div>

        {/* Referral link */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">
            Sizning referal havolangiz
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-mono text-[11px] font-bold text-slate-700">
                {status.link}
              </span>
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Nusxalandi" : "Nusxalash"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Havolani do&apos;stlaringizga yuboring — ular ro&apos;yxatdan o&apos;tib profilini to&apos;ldirsa, ball olasiz.
          </p>
        </div>

        {/* Referred users */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
              Taklif qilinganlar ({status.referredUsers.length})
            </p>
          </div>
          {status.referredUsers.length === 0 ? (
            <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-3">
              Hozircha hech kimni taklif qilmagansiz.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {status.referredUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-700">{u.name}</p>
                    <p className="truncate text-[10px] text-slate-400">{u.email}</p>
                  </div>
                  {u.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Check className="h-3 w-3" /> Faol
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      Kutilmoqda
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
