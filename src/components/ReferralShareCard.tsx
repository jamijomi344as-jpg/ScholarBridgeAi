"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, Copy, Check, Link2 } from "lucide-react";

interface ReferralShareCardProps {
  code: string;
  link: string;
  onApplyCode: (code: string) => Promise<boolean>;
}

export function ReferralShareCard({ code, link, onApplyCode }: ReferralShareCardProps) {
  const t = useTranslations("rewards");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [applyValue, setApplyValue] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async (value: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyValue.trim()) return;
    setBusy(true);
    const ok = await onApplyCode(applyValue.trim());
    setMessage(ok ? { ok: true, text: t("codeApplied") } : { ok: false, text: t("codeInvalid") });
    setBusy(false);
    if (ok) setApplyValue("");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-emerald-500" />
        <h3 className="font-bold text-slate-900 text-sm">{t("referral")}</h3>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{t("referralDescription")}</p>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">{t("referralCode")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800 tracking-widest">
              {code}
            </div>
            <button
              onClick={() => copy(code, "code")}
              className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">{t("referralLink")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 truncate">
              {link}
            </div>
            <button
              onClick={() => copy(link, "link")}
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              {copied === "link" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleApply} className="pt-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">{t("enterReferralCode")}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={applyValue}
            onChange={(e) => setApplyValue(e.target.value)}
            placeholder={t("referralCode")}
            className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!applyValue.trim() || busy}
            className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {t("applyCode")}
          </button>
        </div>
        {message && (
          <p className={`text-[11px] mt-2 font-semibold ${message.ok ? "text-emerald-600" : "text-red-500"}`}>{message.text}</p>
        )}
      </form>
    </div>
  );
}
