"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { restoreAuthCookies, clearOAuthState } from "@/lib/supabase/oauth-utils";

/**
 * OAuth callback — CLIENT-SIDE PKCE code exchange.
 *
 * The new @supabase/ssr/auth-js uses "multi-flow PKCE": the code verifier is
 * stored in a cookie named `<storageKey>-flow-<flowId>-code-verifier`, and the
 * flow id travels back to us in the `sb_flow_id` query parameter. We pass it
 * explicitly to exchangeCodeForSession (the SDK can also read it from the URL
 * itself). If the verifier cookie is missing, we show the exact state so the
 * user can restart the flow.
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
  const [debug, setDebug] = useState<string[]>([]);
  const [status, setStatus] = useState("Google orqali kirish tasdiqlanmoqda…");

  /** Sanitize the `next` param to avoid open redirects. */
  const safeNext = (next: string): string =>
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = searchParams.get("code");
      // IMPORTANT: do NOT pass a flowId from localStorage — it may belong to
      // a different (already consumed) flow, which makes Supabase reject the
      // exchange with "invalid flow state". Let the SDK resolve the flow
      // itself: it reads `sb_flow_id` from the URL if present, otherwise it
      // falls back to the legacy `-code-verifier` cookie (the most recent
      // flow — which is the one that produced this code).
      const flowId = searchParams.get("sb_flow_id") || undefined;
      const errorParam = searchParams.get("error");
      const next = searchParams.get("next") ?? "/";

      // Restore PKCE verifier cookies if the browser dropped them during the
      // Google round-trip (this is the #1 cause of "code verifier not found").
      restoreAuthCookies();

      // ---- Diagnostics: what does the browser actually have? ----
      const diag: string[] = [];
      try {
        const cookieNames =
          typeof document !== "undefined"
            ? document.cookie.split("; ").map((c) => c.split("=")[0])
            : [];
        diag.push(`URL flowId: ${flowId || "(yo'q)"}`);
        diag.push(`Code: ${code ? "bor" : "(yo'q)"}`);
        const authCookies = cookieNames.filter(
          (n) => n.includes("sb-") || n.includes("code-verifier")
        );
        diag.push(
          authCookies.length
            ? `Auth cookie'lari: ${authCookies.join(", ")}`
            : "Auth cookie'lari: (hech qanday)"
        );
      } catch (e) {
        diag.push(`Cookie o'qishda xato: ${String(e)}`);
      }
      setDebug(diag);

      if (errorParam) {
        if (!cancelled) setError("Google orqali kirish bekor qilindi yoki rad etildi.");
        return;
      }
      if (!code) {
        if (!cancelled)
          setError(
            "Tasdiqlash kodi topilmadi. Iltimos, qayta urinib ko'ring (login sahifasidan)."
          );
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();

        // 1) If a session already exists (e.g. this callback ran before and
        // the exchange already succeeded), just continue into the app —
        // exchanging the same code again would fail with "invalid flow state".
        const {
          data: { user: existingUser },
        } = await supabase.auth.getUser();
        if (existingUser) {
          clearOAuthState();
          if (!cancelled) router.replace(safeNext(next));
          return;
        }

        // 2) Exchange the code. No explicit flowId from localStorage — the
        // SDK resolves the flow from the URL (sb_flow_id) or the legacy key.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          code,
          flowId ? { flowId } : undefined
        );
        clearOAuthState();

        if (cancelled) return;

        if (exchangeError) {
          // 3) The exchange may have failed because ANOTHER tab/run already
          // consumed the code and created the session. Double-check before
          // giving up.
          const {
            data: { user: retryUser },
          } = await supabase.auth.getUser();
          if (retryUser) {
            router.replace(safeNext(next));
            return;
          }
          console.error("Client OAuth exchange error:", exchangeError);
          setError(
            "Sessiya yaratib bo'lmadi: " +
              (exchangeError.message || "noma'lum xato") +
              ". Qayta urinib ko'ring."
          );
          return;
        }

        setStatus("Muvaffaqiyatli! Kirilmoqda…");
        setTimeout(() => router.replace(safeNext(next)), 400);
      } catch (err: any) {
        if (!cancelled) setError("Xatolik: " + (err?.message || String(err)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  /** Clear stale auth cookies and restart the flow from the login page. */
  const restart = () => {
    try {
      document.cookie.split("; ").forEach((c) => {
        const name = c.split("=")[0];
        if (name.includes("sb-") || name.includes("code-verifier")) {
          document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
        }
      });
    } catch {
      // ignore
    }
    router.replace("/login");
  };

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

            {/* Diagnostics */}
            {debug.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Diagnostika
                </p>
                {debug.map((d, i) => (
                  <p key={i} className="text-[10px] font-mono text-slate-500 break-all">
                    {d}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={restart}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white hover:from-indigo-700 hover:to-violet-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Qayta boshlash (login)
              </button>
              <Link
                href="/login"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                Kirish sahifasiga qaytish
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-slate-900">{status}</h1>
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
