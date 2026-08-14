"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, RefreshCw, CheckCircle2, KeyRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-indigo-100 text-sm">Yuklanmoqda…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").trim();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // If the user already confirmed their email by CLICKING THE LINK from the
  // email, a session exists — skip the code screen and go straight in.
  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          router.replace("/");
        }
      } catch {
        // supabase env not configured yet — ignore
      }
    })();
  }, [router]);

  // Resend countdown timer.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const code = digits.join("");

  const focusInput = (i: number) => {
    inputsRef.current[i]?.focus();
    inputsRef.current[i]?.select();
  };

  const handleChange = (i: number, value: string) => {
    // Digits only.
    const clean = value.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);

    if (clean && i < OTP_LENGTH - 1) {
      focusInput(i + 1);
    } else if (clean && i === OTP_LENGTH - 1) {
      // Auto-submit once the 6th digit is entered.
      const fullCode = next.join("");
      if (fullCode.length === OTP_LENGTH) void verify(fullCode);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      focusInput(i - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    focusInput(Math.min(text.length, OTP_LENGTH - 1));
  };

  const verify = async (fullCode?: string) => {
    const token = fullCode ?? code;
    if (token.length !== OTP_LENGTH) {
      setError("6 xonali kodni to'liq kiriting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });

      if (verifyError) {
        setError("Kod noto'g'ri yoki muddati tugagan. Qayta yuborib, qayta urinib ko'ring.");
        setDigits(Array(OTP_LENGTH).fill(""));
        focusInput(0);
        return;
      }

      // Signed in successfully → app decides: wizard or dashboard.
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Tekshirishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || !email) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) {
        setError(resendError.message || "Kodni qayta yuborishda xatolik yuz berdi.");
        return;
      }
      setInfo("Yangi kod emailingizga yuborildi. Iltimos, kirish qutisini tekshiring.");
      setResendIn(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      focusInput(0);
    } catch (err: any) {
      setError(err.message || "Kodni qayta yuborishda xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-11 sm:w-12 h-12 sm:h-14 rounded-xl border-2 bg-white text-center text-lg sm:text-xl font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
          <KeyRound className="h-6 w-6 text-amber-300" />
        </div>
        <h1 className="mt-3 text-xl font-extrabold text-white">Tasdiqlash kodi</h1>
        <p className="text-xs text-indigo-100 mt-1.5 break-all">
          {email ? (
            <>
              <Mail className="h-3 w-3 inline mr-1" />
              {email} manziliga 6 xonali kod yuborildi
            </>
          ) : (
            "Email manzilingizga 6 xonali kod yuborildi"
          )}
        </p>
      </div>

      <div className="p-7 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}
        {info && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {info}
          </div>
        )}

        {/* 6 OTP boxes */}
        <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={2}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`${inputCls} ${
                d ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200"
              }`}
              aria-label={`Kod raqami ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => verify()}
          disabled={busy || code.length !== OTP_LENGTH}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tasdiqlash"}
        </button>

        {/* Resend */}
        <div className="text-center">
          <button
            onClick={resend}
            disabled={resendIn > 0 || busy || !email}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resendIn > 0 ? "animate-spin" : ""}`} />
            {resendIn > 0 ? `Qayta yuborish (${resendIn}s)` : "Kodni qayta yuborish"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500">
          Email topilmadi?{" "}
          <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-800">
            Qayta ro&apos;yxatdan o&apos;tish
          </Link>
        </p>

        {/* Fallback: user received a LINK instead of a code */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-center">
          <p className="text-[11px] text-slate-600">
            Emailingizda kod o&apos;rniga <b>havola</b> keldimi? Havolani bosgan
            bo&apos;lsangiz:
          </p>
          <button
            onClick={() => router.replace("/")}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Men tasdiqladim — davom etish
          </button>
        </div>
      </div>
    </div>
  );
}
