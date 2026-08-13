"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { PointsBadge } from "./PointsBadge";
import { LevelProgressBar } from "./LevelProgressBar";
import { BadgeShowcase, UserBadge } from "./BadgeShowcase";
import { ReferralShareCard } from "./ReferralShareCard";
import { ReferralProgramCard } from "./ReferralProgramCard";
import { Leaderboard, LeaderboardEntry } from "./Leaderboard";

interface RewardsSectionProps {
  activeProfile: StudentProfile | null;
}

interface GamificationData {
  totalPoints: number;
  level: { id: number; name: string; minPoints: number; iconUrl: string };
  nextLevel: { id: number; name: string; minPoints: number; iconUrl: string } | null;
  pointsIntoLevel: number;
  pointsForLevel: number;
  badges: UserBadge[];
  profileCompleteness: number;
}

export function RewardsSection({ activeProfile }: RewardsSectionProps) {
  const t = useTranslations("rewards");
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [referral, setReferral] = useState<{ code: string; link: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const [gamRes, lbRes, refRes] = await Promise.all([
        fetch(`/api/gamification?profileId=${activeProfile.id}`),
        fetch("/api/gamification/leaderboard"),
        fetch(`/api/referrals?profileId=${activeProfile.id}`),
      ]);
      const gam = await gamRes.json();
      const lb = await lbRes.json();
      const ref = await refRes.json();
      setGamification(gam);
      if (lb.leaderboard) setLeaderboard(lb.leaderboard);
      if (ref.code) setReferral({ code: ref.code, link: ref.link });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleApplyCode = async (code: string): Promise<boolean> => {
    if (!activeProfile) return false;
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, referralCode: code }),
      });
      if (res.ok) {
        loadAll();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  if (!activeProfile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center">
        <p className="text-sm text-slate-500">{t("noBadges")}</p>
      </div>
    );
  }

  if (loading || !gamification) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
        <p className="text-sm text-slate-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold">{t("title")}</h1>
              <p className="text-xs text-white/80 mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
          <PointsBadge points={gamification.totalPoints} levelName={gamification.level.name} levelIcon={gamification.level.iconUrl} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <LevelProgressBar
            levelName={gamification.level.name}
            levelIcon={gamification.level.iconUrl}
            totalPoints={gamification.totalPoints}
            pointsIntoLevel={gamification.pointsIntoLevel}
            pointsForLevel={gamification.pointsForLevel}
            nextLevelName={gamification.nextLevel?.name}
          />
          {referral && (
            <ReferralShareCard code={referral.code} link={referral.link} onApplyCode={handleApplyCode} />
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Referral program v2: link, points, progress bar, premium badge,
              referred users list */}
          <ReferralProgramCard activeProfile={activeProfile} />
          <BadgeShowcase badges={gamification.badges} />
          <Leaderboard entries={leaderboard} highlightProfileId={activeProfile.id} />
        </div>
      </div>
    </div>
  );
}
