"use client";

/**
 * OAuth PKCE helpers.
 *
 * The new @supabase/auth-js stores the PKCE code verifier in cookies named
 * `<storageKey>-flow-<flowId>-code-verifier` (+ a legacy key and an index).
 * If those cookies are missing when the user returns from Google, the code
 * exchange fails with "PKCE code verifier not found in storage".
 *
 * To make the flow bulletproof we:
 *  1. start OAuth with `skipBrowserRedirect: true`, so the response includes
 *     `flowId`, which we keep in localStorage;
 *  2. back up every `sb-*` / `*-code-verifier` cookie into localStorage;
 *  3. on the callback page, restore any missing cookies BEFORE exchanging
 *     the code, and pass the flowId explicitly.
 */

export function backupAuthCookies(): void {
  try {
    const map: Record<string, string> = {};
    document.cookie.split("; ").forEach((c) => {
      const i = c.indexOf("=");
      if (i <= 0) return;
      const name = c.slice(0, i);
      const value = c.slice(i + 1);
      if (name.includes("sb-") || name.includes("code-verifier")) {
        map[name] = value;
      }
    });
    localStorage.setItem("sb_auth_cookie_backup", JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** Restore auth cookies that the browser lost between login and callback. */
export function restoreAuthCookies(): void {
  try {
    const raw = localStorage.getItem("sb_auth_cookie_backup");
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, string>;
    Object.entries(map).forEach(([name, value]) => {
      if (!document.cookie.split("; ").some((c) => c.startsWith(name + "="))) {
        document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=3600`;
      }
    });
  } catch {
    // ignore
  }
}

export function getStoredFlowId(): string | null {
  try {
    return localStorage.getItem("sb_flow_id");
  } catch {
    return null;
  }
}

export function storeFlowId(flowId: string | null | undefined): void {
  try {
    if (flowId) localStorage.setItem("sb_flow_id", flowId);
  } catch {
    // ignore
  }
}

export function clearOAuthState(): void {
  try {
    localStorage.removeItem("sb_flow_id");
    localStorage.removeItem("sb_auth_cookie_backup");
  } catch {
    // ignore
  }
}
