"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { X, CreditCard, ArrowRight } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  onPaid: () => void;
}

export function CheckoutModal({ isOpen, onClose, profileId, onPaid }: CheckoutModalProps) {
  const t = useTranslations("payments");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startCheckout = async (provider: "payme" | "click") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, provider }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      // Poll shortly after opening the gateway to reflect any paid status.
      setTimeout(() => {
        onPaid();
        setLoading(false);
      }, 4000);
    } catch (err) {
      console.error(err);
      setError("Checkout failed. Please try again.");
      setLoading(false);
    }
  };

  const providers: { id: "payme" | "click"; name: string; color: string; note: string }[] = [
    { id: "payme", name: "Payme", color: "from-blue-500 to-blue-600", note: t("payme") },
    { id: "click", name: "Click", color: "from-violet-500 to-purple-600", note: t("click") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">{t("checkout")}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">{t("planLabel")}: {t("planPremium")}</span>
            <span className="text-lg font-extrabold text-indigo-900">59,000 UZS</span>
          </div>
          <p className="text-[11px] text-indigo-600 mt-1">/ 30 days</p>
        </div>

        <p className="text-xs font-semibold text-slate-600">{t("chooseProvider")}</p>

        <div className="space-y-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => startCheckout(provider.id)}
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r text-white font-bold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              style={{ backgroundImage: `linear-gradient(to right, ${provider.id === "payme" ? "#2563eb, #1d4ed8" : "#7c3aed, #9333ea"})` }}
            >
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {provider.name}
              </span>
              <span className="text-xs opacity-80">{t("payWith")} {provider.name}</span>
            </button>
          ))}
        </div>

        {loading && <p className="text-xs text-slate-500 text-center">{t("redirecting")}...</p>}
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1"
        >
          {t("cancel")} <ArrowRight className="h-3.5 w-3.5 rotate-180" />
        </button>
      </div>
    </div>
  );
}
