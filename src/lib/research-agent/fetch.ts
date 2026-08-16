/**
 * Fetching with retries, caching, same-domain protection and PDF handling
 * (spec §3D, §18, §21, §23).
 */
import { AGENT_CONFIG } from "./config";
import { isSameDomain } from "./domain";
import { isResearchContentType } from "./urlFilter";

const cache = new Map<string, { html: string; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Fetch a page's text content with retries. Returns null on final failure. */
export async function fetchPageText(url: string): Promise<string | null> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.html;

  for (let attempt = 0; attempt <= AGENT_CONFIG.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AGENT_CONFIG.timeoutMs);
      const res = await fetch(url, {
        headers: { "User-Agent": AGENT_CONFIG.userAgent, Accept: "text/html,application/pdf,*/*" },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      // Only research pages are fetched: HTML, PDF, plain text. Fonts,
      // stylesheets, scripts and images are never treated as pages.
      if (!isResearchContentType(contentType)) {
        console.warn(`[research-agent] skipped non-page content-type: ${contentType} (${url})`);
        return null;
      }
      let text = "";
      if (contentType.includes("application/pdf")) {
        // PDF text extraction is not implemented in the MVP — mark as unparsed.
        text = "";
      } else {
        text = await res.text();
      }
      // Strip scripts/styles to reduce noise.
      text = text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
      cache.set(url, { html: text, at: Date.now() });
      return text;
    } catch (err) {
      console.warn(`[research-agent] fetch failed (${attempt}/${AGENT_CONFIG.retries}): ${url}`, err);
      await sleep(600 * (attempt + 1));
    }
  }
  return null;
}

/**
 * Fetch the homepage of a domain, trying both bare and www variants.
 * Many official sites (e.g. imperial.ac.uk) only serve HTTPS on www — the
 * agent must tolerate both. Returns the working URL together with the HTML.
 */
export async function fetchHomepage(
  domain: string
): Promise<{ url: string; html: string } | null> {
  const candidates = domain.startsWith("www.")
    ? [domain, domain.replace(/^www\./, "")]
    : [domain, `www.${domain}`];
  for (const d of candidates) {
    const url = `https://${d}/`;
    const html = await fetchPageText(url);
    if (html) return { url, html };
  }
  return null;
}

/** Extract same-domain absolute URLs from HTML. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  const base = new URL(baseUrl);
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    try {
      const url = new URL(href, base).toString();
      // Same-domain only, www/bare tolerant (spec §3D).
      if (isSameDomain(url, base.host)) out.add(url);
    } catch {
      // ignore malformed
    }
  }
  return [...out];
}

/** Strip HTML tags → plain text (keeps tables readable line by line). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h1|h2|h3|h4|td|th)>/gi, "\n")
    .replace(/<t[dh][^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
