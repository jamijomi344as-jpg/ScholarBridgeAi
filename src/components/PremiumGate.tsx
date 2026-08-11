"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { Lock, Crown } from "lucide-react";

interface PremiumGateProps {
  profileId: number | null;
  title?: string;
  description?: string;
  onUpgrade: () => void;
  children: ReactNode;
}

/**
 * Wraps a premium-only section. If the profile is not an active subscriber,
 * it shows a lock overlay prompting the user to buy Premium, with a button
 * that navigates to the payments section.
 */
export function PremiumGate({ profileId, title, description, onUpgrade, children }: PremiumGateProps) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setIsPremium(false);
      return;
    }
    fetch(`/api/premium/status?profileId=${profileId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setIsPremium(!!data.isPremium);
      })
      .catch(() => {
        if (!cancelled) setIsPremium(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-30 select-none blur-[1px] max-h-[420px] overflow-hidden">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur rounded-3xl border border-amber-300 shadow-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {title || "This is Premium"}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {description || "You need an active Premium subscription to access this section."}
            </p>
          </div>
          <button
            onClick={onUpgrade}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-xl shadow-md transition-all"
          >
            Buy Premium
          </button>
          <p className="text-[11px] text-slate-400">Unlock Tasks, Community Forum &amp; Courses</p>
        </div>
      </div>
    </div>
  );
}
