import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * OAuth callback (Google etc.). Supabase redirects the user back here with
 * ?code=... after they authorize. We exchange the code for a session cookie,
 * then send the user into the app.
 *
 * On failure we redirect to /login?error=... so the user (and the developer)
 * sees exactly what went wrong instead of silently landing on the home page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const next = searchParams.get("next") ?? "/";

  // Always prefer a real public NEXT_PUBLIC_APP_URL when it is configured —
  // even if the request somehow arrives at a localhost origin. This keeps
  // the user on the production domain.
  const envBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const envIsLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(envBase);
  const appBase = !envIsLocal && envBase ? envBase : origin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase itself reported an OAuth error.
  if (errorParam) {
    console.error("OAuth error param from Supabase:", errorParam);
    return NextResponse.redirect(
      `${appBase}/login?error=oauth_denied&details=${encodeURIComponent(errorParam)}`
    );
  }

  // No code → Supabase did not redirect us properly (usually the Redirect
  // URLs list in Supabase → Auth → URL Configuration is missing our callback).
  if (!code) {
    console.error("OAuth callback received no code. Origin:", origin);
    return NextResponse.redirect(
      `${appBase}/login?error=no_code&details=${encodeURIComponent(origin)}`
    );
  }

  if (supabaseUrl && supabaseAnonKey) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (err) {
            console.error("OAuth callback: failed to set session cookie:", err);
          }
        },
      },
    });

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("OAuth code exchange error:", error);
        return NextResponse.redirect(
          `${appBase}/login?error=exchange_failed&details=${encodeURIComponent(error.message)}`
        );
      }

      // Sanitize `next` to avoid open redirects.
      const safeNext =
        typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/";
      return NextResponse.redirect(`${appBase}${safeNext}`);
    } catch (err: any) {
      console.error("OAuth callback unexpected error:", err);
      return NextResponse.redirect(
        `${appBase}/login?error=callback_error&details=${encodeURIComponent(String(err?.message || err))}`
      );
    }
  }

  // Supabase env vars missing.
  return NextResponse.redirect(`${appBase}/login?error=supabase_not_configured`);
}
