"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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
          Email va parolingiz bilan kiring.
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
