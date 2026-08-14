import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultLocale, isLocale, locales } from "@/i18n/config";

/**
 * Middleware does two jobs:
 *
 * 1. Locale routing — /en, /uz, /ru prefixes are rewritten to the
 *    locale-agnostic route and the choice is persisted in a cookie.
 * 2. Supabase session refresh — keeps the auth cookie alive on every request.
 *
 * Supabase env vars are optional here: if they are not configured yet, the
 * middleware still serves the locale logic without crashing.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localeCookie = "scholarbridge_locale";

  let response = NextResponse.next({ request });

  // ---------- 1. Locale routing ----------
  const hasLocalePrefix = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (hasLocalePrefix) {
    const segment = pathname.split("/")[1];
    const locale = isLocale(segment) ? segment : defaultLocale;
    const rest = pathname.slice(locale.length + 1) || "/";

    const url = request.nextUrl.clone();
    url.pathname = rest;
    response = NextResponse.rewrite(url);
    response.cookies.set(localeCookie, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } else {
    // For unprefixed requests, seed the default locale cookie if it is missing.
    const existing = request.cookies.get(localeCookie)?.value;
    if (!existing) {
      response.cookies.set(localeCookie, defaultLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  }

  // ---------- 2. Supabase session refresh ----------
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // IMPORTANT: do not run code between createServerClient and
      // supabase.auth.getUser() — it can invalidate the session.
      await supabase.auth.getUser();
    } catch (err) {
      console.error("Supabase middleware error:", err);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
