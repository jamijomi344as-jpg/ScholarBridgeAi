"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Iltimos, to'g'ri email manzilini kiriting.");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (password !== confirm) {
      setError("Parollar bir-biriga mos emas.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) {
        const msg = (authError.message || "").toLowerCase();
        if (msg.includes("already registered")) {
          setError(
            "Bu email allaqachon ro'yxatdan o'tgan. Kirish sahifasidan kirishingiz mumkin."
          );
        } else if (msg.includes("sending confirmation email") || msg.includes("email provider") || msg.includes("rate limit") || msg.includes("too many")) {
          setError(
            "Tasdiqlash xatini yuborib bo'lmadi. Sabab: Supabase email xizmati cheklovi (soatiga 2-4 ta xat) yoki SMTP sozlanmagan. Iltimos: 30-60 daqiqa kuting yoki Supabase Auth sozlamalarida SMTP o'rnating."
          );
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.session) {
        // Email confirmation is disabled in the dashboard — already signed in.
        router.replace("/");
        return;
      }

      // OTP flow: go to the 6-digit code page.
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik yuz berdi. Qayta urinib ko'ring.");
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
          <Sparkles className="h-3 w-3 text-amber-300" /> BEPUL — 2 daqiqada hisob
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-white">Hisob yaratish</h1>
        <p className="text-xs text-indigo-100 mt-1">
          Email va parol kiriting — tasdiqlash kodi emailingizga yuboriladi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-7 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

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
              placeholder="Kamida 6 belgi"
              className={inputCls}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Parolni takrorlang
          </label>
          <div className="relative">
            <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Parolni qayta kiriting"
              className={inputCls}
              autoComplete="new-password"
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
              Davom etish <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-800">
            Kirish
          </Link>
        </p>
      </form>
    </div>
  );
}
