import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Centralized app configuration (spec §3 — NO hardcoded data).
 * Values live in the `app_config` table and are editable by admins.
 * Falls back to defaults defined here (single source of truth for defaults).
 */

export interface ConfigDefaults {
  [key: string]: string;
}

export const CONFIG_DEFAULTS: ConfigDefaults = {
  // Payment (spec §18 — no hardcoded amounts)
  payment_premium_price_uzs: "59000",
  payment_premium_days: "30",
  payment_currency: "UZS",
  // AI limits (spec §16)
  ai_free_requests_per_day: "5",
  ai_premium_requests_per_day: "50",
  ai_free_tokens_per_day: "20000",
  ai_premium_tokens_per_day: "200000",
  ai_default_provider: "openrouter",
  ai_provider_admissions: "openrouter",
  ai_provider_essay: "openrouter",
  ai_provider_general: "openrouter",
  ai_provider_search: "openrouter",
  ai_provider_document: "openrouter",
  // Data refresh (spec §9)
  refresh_interval_hours: "24",
  refresh_default_scope: "all",
  // Referral (spec — existing)
  referral_premium_multiple: "5",
  referral_premium_days: "30",
};

const cache = new Map<string, string | null>();

/** Get a config value (cached per process). */
export async function getConfig(key: string): Promise<string> {
  if (cache.has(key)) return cache.get(key) as string;
  try {
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    const value = row?.value ?? CONFIG_DEFAULTS[key] ?? "";
    cache.set(key, value);
    return value;
  } catch {
    // DB unavailable — fall back to defaults so the app still works.
    return CONFIG_DEFAULTS[key] ?? "";
  }
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const raw = await getConfig(key);
  const n = Number(raw);
  return Number.isFinite(n) && raw !== "" ? n : fallback;
}

/** Set a config value (admin only — caller must verify isAdmin). */
export async function setConfig(key: string, value: string, description?: string) {
  const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, key));
  if (existing) {
    await db
      .update(appConfig)
      .set({ value, description: description ?? existing.description, updatedAt: new Date() })
      .where(eq(appConfig.key, key));
  } else {
    await db.insert(appConfig).values({
      key,
      value,
      description: description ?? CONFIG_DEFAULTS[key] ? undefined : description,
    });
  }
  cache.set(key, value);
  return getConfig(key);
}

/** List all config (defaults merged with DB values). */
export async function getAllConfig(): Promise<{ key: string; value: string; description: string | null }[]> {
  const rows = await db.select().from(appConfig);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.keys(CONFIG_DEFAULTS).map((key) => ({
    key,
    value: map.get(key) ?? CONFIG_DEFAULTS[key],
    description: rows.find((r) => r.key === key)?.description ?? null,
  }));
}

/** Invalidate the cache after a direct DB change. */
export function invalidateConfigCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}
