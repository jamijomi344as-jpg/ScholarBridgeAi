/**
 * Normalization helpers (spec §13 — dedupe keys, §7 — currencies).
 */

export function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|of|and|&)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}

export function normalizeCurrency(c: string | undefined | null): string | null {
  if (!c) return null;
  const up = c.trim().toUpperCase();
  return /^(USD|GBP|EUR|CHF|CAD|AUD|HKD|SGD|JPY|KRW|UZS|NZD|CNY|INR)$/.test(up) ? up : null;
}

export function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function toIsoDate(v: string | undefined | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function boolFromEvidence(v: unknown): boolean | null {
  if (v === true || v === "true" || v === "yes") return true;
  if (v === false || v === "false" || v === "no") return false;
  return null;
}
