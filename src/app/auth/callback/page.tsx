"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * OAuth callback — CLIENT-SIDE code exchange.
 *
 * Supabase redirects here after Google auth with ?code=... . We exchange the
 * code in the browser: the Supabase browser client writes the session
 * cookies directly into this browser, which works reliably in production
 * (no server cookie-setting pitfalls). Then we go into the app; the session
 * check on the home page picks the session up from the cookie.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 flex items-center justify-center px-4">
          <div className="text-center text-indigo-100 text-sm font-semibold">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            Yuklanmoqda…
          </div>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Google orqali kirish tasdiqlanmoqda…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const next = searchParams.get("next") ?? "/";

      if (errorParam) {
        if (!cancelled)
          setError("Google orqali kirish bekor qilindi yoki rad etildi.");
        return;
      }
      if (!code) {
        if (!cancelled)
          setError(
            "Tasdiqlash kodi topilmadi. Iltimos, Supabase → Authentication → URL Configuration → Redirect URLs ga quyidagi manzilni qo'shing: /auth/callback"
          );
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) return;

        if (exchangeError) {
          console.error("Client OAuth exchange error:", exchangeError);
          setError(
            "Sessiya yaratib bo'lmadi: " +
              (exchangeError.message || "noma'lum xato") +
              ". Qayta urinib ko'ring."
          );
          return;
        }

        setStatus("Muvaffaqiyatli! Kirilmoqda…");
        const safeNext =
          typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/";
        // Small delay so the success state is visible.
        setTimeout(() => router.replace(safeNext), 400);
      } catch (err: any) {
        if (!cancelled)
          setError("Xatolik: " + (err?.message || String(err)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center">
        {error ? (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-slate-900">
              Kirishda xatolik
            </h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed break-all">
              {error}
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white hover:from-indigo-700 hover:to-violet-700"
            >
              Kirish sahifasiga qaytish
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-slate-900">
              {status}
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Iltimos kuting…
            </div>
          </>
        )}
      </div>
    </div>
  );
}
