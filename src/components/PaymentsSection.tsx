"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";
import { PaymentHistory, PaymentItem } from "./PaymentHistory";
import { CheckoutModal } from "./CheckoutModal";

interface PaymentsSectionProps {
  activeProfile: StudentProfile | null;
}

export function PaymentsSection({ activeProfile }: PaymentsSectionProps) {
  const t = useTranslations("payments");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments?profileId=${activeProfile.id}`);
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
      setIsPremium(!!data.isPremium);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!activeProfile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center">
        <p className="text-sm text-slate-500">{t("noSubscription")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{t("title")}</h1>
              <p className="text-xs text-slate-800 mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
          <SubscriptionStatusBadge isPremium={isPremium} />
        </div>
      </div>

      {!isPremium && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{t("planPremium")}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">59,000 UZS {t("perMonth")}</p>
          </div>
          <button
            onClick={() => setShowCheckout(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
          >
            {t("upgrade")}
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
          <p className="text-sm text-slate-500">{t("loading")}</p>
        </div>
      ) : (
        <PaymentHistory payments={payments} />
      )}

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        profileId={activeProfile.id}
        onPaid={() => {
          setShowCheckout(false);
          loadData();
        }}
      />
    </div>
  );
}
