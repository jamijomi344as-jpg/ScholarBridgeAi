"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Award } from "lucide-react";

export interface UserBadge {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  awardedAt: string;
}

interface BadgeShowcaseProps {
  badges: UserBadge[];
}

export function BadgeShowcase({ badges }: BadgeShowcaseProps) {
  const t = useTranslations("rewards");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
        <Award className="h-4 w-4 text-amber-500" />
        {t("badges")} ({badges.length})
      </h3>

      {badges.length === 0 ? (
        <p className="text-xs text-slate-400">{t("noBadges")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <span className="text-3xl mb-1.5">{badge.iconUrl}</span>
              <p className="text-xs font-bold text-slate-800">{badge.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{badge.description}</p>
              <p className="text-[9px] text-slate-300 mt-1">{new Date(badge.awardedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
