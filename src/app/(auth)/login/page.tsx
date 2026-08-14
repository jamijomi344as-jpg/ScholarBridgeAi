"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, LogIn, AlertCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  no_code:
    "Google tasdiqlashdan keyin saytga qaytishda xatolik yuz berdi. Supabase → Authentication → URL Configuration → Redirect URLs ga sayt manzilingizni qo'shing: https://scholarbridgeai-1.onrender.com/auth/callback",
  exchange_failed:
    "Google sessiyasini yaratib bo'lmadi (code exchange xatosi). Qayta urinib ko'ring.",
  oauth_denied: "Google orqali kirish bekor qilindi yoki rad etildi.",
  callback_error:
    "Kirish jarayonida kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.",
  supabase_not_configured:
    "Supabase sozlanmagan. Iltimos, administratorga murojaat qiling.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md text-center text-indigo-100 text-sm py-10">
          Yuklanmoqda…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const oauthDetails = searchParams.get("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email va parolni kiriting.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const msg = authError.message.toLowerCase();

        // Email registered but not confirmed → send a fresh OTP and route
        // the user to the code page.
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          try {
            await supabase.auth.resend({ type: "signup", email: email.trim() });
          } catch {
            // ignore resend failure — the verify page can resend too
          }
          router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }

        if (msg.includes("invalid login credentials")) {
          setError("Email yoki parol noto'g'ri.");
        } else {
          setError(authError.message);
        }
        return;
      }

      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Kirishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  };

  /** The callback URL the browser will be redirected to after Google auth. */
  const getCallbackUrl = (): string => {
    if (typeof window === "undefined") return "";
    const envBase = process.env.NEXT_PUBLIC_APP_URL || "";
    const envIsLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(envBase);
    const base = envIsLocal ? window.location.origin : envBase || window.location.origin;
    return `${base}/auth/callback`;
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = getCallbackUrl();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) setError(oauthError.message || "Google orqali kirishda xatolik yuz berdi.");
    } catch (err: any) {
      setError(err.message || "Google orqali kirishda xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow";

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white border border-white/20">
          <LogIn className="h-3 w-3 text-amber-300" /> XUSH KELIBSIZ!
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-white">Tizimga kirish</h1>
        <p className="text-xs text-indigo-100 mt-1">
          Email yoki Google hisobingiz bilan kiring.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-7 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {oauthError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800">
                  {ERROR_MESSAGES[oauthError] || "Kirishda xatolik yuz berdi."}
                </p>
                {oauthDetails && (
                  <p className="text-[10px] text-amber-600 mt-1 break-all font-mono">
                    {oauthDetails.slice(0, 300)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 transition-all"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
          Google bilan kirish
        </button>
        {/* Dev aid: shows exactly where OAuth will send the user. */}
        <p className="text-center text-[10px] text-slate-300 break-all">
          Callback: {getCallbackUrl()}
        </p>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">yoki</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Email manzil
          </label>
          <div className="relative">
            <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siz@example.com"
              className={inputCls}
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Parol
          </label>
          <div className="relative">
            <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolingiz"
              className={inputCls}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 transition-all"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Kirish <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Hisobingiz yo&apos;qmi?{" "}
          <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-800">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </p>
      </form>
    </div>
  );
}
