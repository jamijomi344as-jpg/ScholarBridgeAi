"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Crown, ShieldCheck } from "lucide-react";

export function SubscriptionStatusBadge({ isPremium }: { isPremium: boolean }) {
  const t = useTranslations("payments");

  if (isPremium) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        {t("subscriptionActive")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
      <Crown className="h-4 w-4 text-amber-500" />
      {t("noSubscription")}
    </span>
  );
}
