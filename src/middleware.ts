import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, locales } from "@/i18n/config";

/**
 * Middleware-based locale routing.
 *
 * Requests prefixed with a locale (/en, /uz, /ru) have their choice persisted
 * as a cookie and are rewritten to the locale-agnostic route, so the whole app
 * works under a single set of routes while still honoring /uz, /ru, /en paths.
 * The client-side LocaleProvider then reads the cookie to select messages.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localeCookie = "scholarbridge_locale";

  const hasLocalePrefix = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (hasLocalePrefix) {
    const segment = pathname.split("/")[1];
    const locale = isLocale(segment) ? segment : defaultLocale;
    const rest = pathname.slice(locale.length + 1) || "/";

    const url = request.nextUrl.clone();
    url.pathname = rest;
    const response = NextResponse.rewrite(url);
    response.cookies.set(localeCookie, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // For unprefixed requests, seed the default locale cookie if it is missing.
  const existing = request.cookies.get(localeCookie)?.value;
  const response = NextResponse.next();
  if (!existing) {
    response.cookies.set(localeCookie, defaultLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
