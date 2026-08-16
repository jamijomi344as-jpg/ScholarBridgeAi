/**
 * Search provider interface (spec §22).
 * The agent is NOT hardwired to one search service.
 */

export interface SearchResult {
  url: string;
  title: string;
  snippet?: string;
}

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}

/**
 * Direct-fetch provider: discovers pages from the official domain itself
 * (homepage → same-domain links classified by URL/text patterns).
 * No third-party search API required — works for the MVP at zero cost.
 */
export class DirectFetchProvider implements SearchProvider {
  constructor(
    private readonly fetchPage: (url: string) => Promise<string | null>,
    private readonly allowedDomains: string[]
  ) {}

  async search(query: string): Promise<SearchResult[]> {
    // query format: "site:example.edu | keyword"
    const siteMatch = /site:([^\s|]+)/.exec(query);
    const domain = siteMatch ? siteMatch[1] : this.allowedDomains[0];
    if (!domain) return [];

    const html = await this.fetchPage(`https://${domain}/`);
    if (!html) return [];

    const results: SearchResult[] = [];
    const seen = new Set<string>();
    const re = /<a[^>]+href="([^"]+)"[^>]*>([^<]{0,80})<\/a>/gi;
    let m: RegExpExecArray | null;
    const kw = query.split("|").slice(1).join("|").toLowerCase();

    while ((m = re.exec(html)) !== null && results.length < 15) {
      let href = m[1];
      const label = m[2].trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
      const url = new URL(href, `https://${domain}/`).toString();
      if (!url.startsWith(`https://${domain}`)) continue; // same-domain only (spec §3D)
      if (seen.has(url)) continue;
      seen.add(url);
      // Keyword filter (admission, tuition, international, scholarship, apply, program)
      if (kw && !`${url} ${label}`.toLowerCase().includes(kw)) continue;
      results.push({ url, title: label || url });
    }
    return results;
  }
}

/**
 * WebSearchProvider — pluggable wrapper for a search API.
 * No provider is configured by default (cost control); when a key is
 * available it can be wired here without touching the agent core.
 */
export class WebSearchProvider implements SearchProvider {
  constructor(
    private readonly endpoint: string | undefined,
    private readonly apiKey: string | undefined
  ) {}

  async search(query: string): Promise<SearchResult[]> {
    if (!this.endpoint || !this.apiKey) {
      console.warn("[research-agent] WebSearchProvider not configured — skipping search:", query);
      return [];
    }
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ query, count: 10 }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      return results
        .filter((r: any) => r?.url)
        .map((r: any) => ({ url: String(r.url), title: String(r.title || ""), snippet: r.snippet }));
    } catch (err) {
      console.error("[research-agent] WebSearchProvider error:", err);
      return [];
    }
  }
}

/** Create the default provider chain: direct fetch first, web search fallback. */
export function createSearchProvider(
  fetchPage: (url: string) => Promise<string | null>,
  allowedDomains: string[]
): SearchProvider {
  return new DirectFetchProvider(fetchPage, allowedDomains);
}
