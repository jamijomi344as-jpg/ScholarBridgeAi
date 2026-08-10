"use client";

import { defaultLocale, LOCALE_COOKIE, type Locale } from "./config";

/** Read the locale persisted in a cookie (client-side). */
export function getLocaleCookie(): string {
  if (typeof window === "undefined") return defaultLocale;
  const match = document.cookie.match(/(?:^|;\s*)scholarbridge_locale=([^;]*)/);
  return match ? match[1] : defaultLocale;
}

/** Persist the locale choice in a cookie (client-side). */
export function setLocaleCookie(locale: Locale) {
  if (typeof window === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

/** Read the locale from a Request's cookie header (server-side). */
export function getLocaleFromRequest(req: Request): Locale {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)scholarbridge_locale=([^;]*)/);
  const value = match ? match[1] : defaultLocale;
  return isLocaleValue(value) ? value : defaultLocale;
}

function isLocaleValue(value: string): value is Locale {
  return ["en", "uz", "ru"].includes(value);
}
