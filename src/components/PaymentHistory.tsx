"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Receipt } from "lucide-react";

export interface PaymentItem {
  id: number;
  provider: "payme" | "click";
  amount: number;
  currency: string;
  status: string;
  purpose: string;
  createdAt: string;
}

interface PaymentHistoryProps {
  payments: PaymentItem[];
}

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
  refunded: "bg-red-100 text-red-700",
};

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  const t = useTranslations("payments");

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
        <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">{t("noPayments")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-indigo-600" />
        <h3 className="font-bold text-slate-900 text-sm">{t("paymentHistory")}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {payments.map((p) => (
          <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                p.provider === "payme" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"
              }`}>
                {p.provider === "payme" ? "P" : "C"}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {p.provider === "payme" ? "Payme" : "Click"} · {p.purpose}
                </p>
                <p className="text-[11px] text-slate-400">
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">
                {p.amount.toLocaleString()} {p.currency}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                {t(p.status) || p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
