/**
 * Safe display formatters (spec §19 — "DATA ACCURACY > COMPLETENESS").
 *
 * NULL / undefined / NaN are NEVER rendered as "0", "NaN" or "undefined".
 * They render as the placeholder (default: "Not specified").
 * Never call value.toLocaleString() / toFixed() / Intl.NumberFormat directly
 * on nullable database values — always route through these helpers.
 */

export type FormatOptions = {
  /** Placeholder for null/undefined/NaN. Default "Not specified". */
  placeholder?: string;
  /** Max fraction digits (default: 0 for money/counts). */
  decimals?: number;
  /** Suffix appended after the number, e.g. "/yr" or "%" (formatPercent handles % itself). */
  suffix?: string;
};

const SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  CHF: "CHF ",
  CAD: "C$",
  AUD: "A$",
  HKD: "HK$",
  SGD: "S$",
  JPY: "¥",
  KRW: "₩",
  UZS: "so'm ",
  NZD: "NZ$",
  CNY: "¥",
  INR: "₹",
};

/** Is the value a real finite number we can display? */
export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Safe integer/float formatter. null/undefined/NaN → placeholder. */
export function formatNumber(
  value: number | string | null | undefined,
  options: FormatOptions = {}
): string {
  const { placeholder = "Not specified", decimals = 0, suffix = "" } = options;
  if (value === null || value === undefined || value === "") return placeholder;
  const n = typeof value === "string" ? Number(value) : value;
  if (!isFiniteNumber(n)) return placeholder;
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${formatted}${suffix}`;
}

/**
 * Safe money formatter with currency symbol (never converts currencies —
 * the currency is displayed as stored). null/undefined/NaN → placeholder.
 */
export function formatMoney(
  value: number | string | null | undefined,
  currency?: string | null,
  options: FormatOptions = {}
): string {
  const { placeholder = "Not specified", suffix = "" } = options;
  if (value === null || value === undefined || value === "") return placeholder;
  const n = typeof value === "string" ? Number(value) : value;
  if (!isFiniteNumber(n)) return placeholder;
  const sym = (currency && SYMBOLS[currency]) || (currency ? `${currency} ` : "");
  return `${sym}${formatNumber(n, { placeholder, suffix: "" })}${suffix}`;
}

/** Safe percentage formatter. null/undefined/NaN → placeholder. */
export function formatPercent(
  value: number | string | null | undefined,
  options: FormatOptions = {}
): string {
  const { placeholder = "Not specified", decimals = 1 } = options;
  if (value === null || value === undefined || value === "") return placeholder;
  const n = typeof value === "string" ? Number(value) : value;
  if (!isFiniteNumber(n)) return placeholder;
  return `${formatNumber(n, { placeholder, decimals, suffix: "%" })}`;
}

/** Safe count formatter (no decimals). null/undefined/NaN → placeholder. */
export function formatCount(
  value: number | string | null | undefined,
  options: FormatOptions = {}
): string {
  const { placeholder = "Not specified" } = options;
  return formatNumber(value, { placeholder, decimals: 0 });
}
