"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";

export interface LeaderboardEntry {
  rank: number;
  profileId: number;
  totalPoints: number;
  name: string;
  email: string;
  targetMajor: string;
  levelName: string | null;
  levelIcon: string | null;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightProfileId?: number | null;
}

const rankColors = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"];

export function Leaderboard({ entries, highlightProfileId }: LeaderboardProps) {
  const t = useTranslations("rewards");

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
        <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">{t("noBadges")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="font-bold text-slate-900 text-base">{t("leaderboard")}</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {entries.map((entry) => {
          const isMe = highlightProfileId != null && entry.profileId === highlightProfileId;
          const medal = entry.rank <= 3;
          return (
            <div
              key={entry.profileId}
              className={`px-5 py-3 flex items-center gap-4 ${isMe ? "bg-indigo-50/60" : ""}`}
            >
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                  medal
                    ? `bg-gradient-to-br ${rankColors[entry.rank - 1]} text-white shadow-sm`
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {entry.rank}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {entry.name} {isMe && <span className="text-indigo-600 text-xs font-semibold">(You)</span>}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {entry.targetMajor} {entry.levelName ? `· ${entry.levelIcon} ${entry.levelName}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-extrabold">
                  {entry.totalPoints.toLocaleString()} {t("points")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
