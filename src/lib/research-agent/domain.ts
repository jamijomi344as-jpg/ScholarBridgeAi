/**
 * Official-domain resolution for the research agent (spec §3B).
 *
 * The DB is the source of truth: a university row may expose its official
 * URL under several column names (Drizzle camelCase properties or raw
 * snake_case DB columns). Resolution is fully generic — first valid HTTP(S)
 * URL wins, in a fixed priority order:
 *
 *   1. officialWebsiteUrl / official_website_url
 *   2. websiteUrl / website_url
 *   3. admissionsUrl / admissions_url
 *   4. internationalAdmissionsUrl / international_admissions_url
 *   5. undergraduateAdmissionsUrl / undergraduate_admissions_url
 *   6. applicationUrl / application_url
 *
 * Third-party application platforms (e.g. UCAS) are never treated as the
 * university's official domain when any university URL exists. Only when
 * every DB URL is missing is the search provider used to discover the
 * official domain.
 */

/** Hosts that are application platforms / aggregators — never an official university domain. */
const THIRD_PARTY_PLATFORM_HOSTS = new Set([
  "ucas.com",
  "www.ucas.com",
  "commonapp.org",
  "thecommonapp.org",
  "unibuddy.com",
  "applywithus.com",
  "topuniversities.com",
  "universityrankings.ch",
  "4icu.org",
  "collegedunia.com",
  "edurank.org",
  "studyportals.com",
  "mastersportal.com",
  "bachelorsportal.com",
  "scholars4dev.com",
  "studyabroad.com",
  // Encyclopedias / social media / review sites — never official domains.
  "wikipedia.org",
  "en.wikipedia.org",
  "wikimedia.org",
  "reddit.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "instagram.com",
  "quora.com",
  "glassdoor.com",
  "indeed.com",
  "niche.com",
  "collegeboard.org",
  "usnews.com",
  "timeshighereducation.com",
  "theguardian.com",
  "bbc.co.uk",
  "bbc.com",
]);

/** Priority-ordered URL candidates: [drizzle camelCase, raw snake_case]. */
const URL_CANDIDATES: [string, string][] = [
  ["officialWebsiteUrl", "official_website_url"],
  ["websiteUrl", "website_url"],
  ["admissionsUrl", "admissions_url"],
  ["internationalAdmissionsUrl", "international_admissions_url"],
  ["undergraduateAdmissionsUrl", "undergraduate_admissions_url"],
  ["applicationUrl", "application_url"],
];

/** Lowercase hostname without the "www." prefix — www and bare are the same site. */
export function normalizeDomain(hostname: string): string {
  let h = hostname.toLowerCase().trim();
  if (h.endsWith(".")) h = h.slice(0, -1);
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

/** True when a URL (or hostname) belongs to the given (possibly www-prefixed) domain. */
export function isSameDomain(urlOrHost: string, domain: string): boolean {
  try {
    const host = urlOrHost.includes("://") ? new URL(urlOrHost).hostname : urlOrHost;
    return normalizeDomain(host) === normalizeDomain(domain);
  } catch {
    return false;
  }
}

function isThirdPartyHost(host: string): boolean {
  const h = normalizeDomain(host);
  return THIRD_PARTY_PLATFORM_HOSTS.has(h) || THIRD_PARTY_PLATFORM_HOSTS.has(`www.${h}`);
}

/**
 * Resolve the official domain from a university row (DB object).
 * Returns the first valid HTTP(S) URL in priority order, or null when the
 * row has no usable university-domain URL (e.g. only an application
 * platform like UCAS is present).
 */
export function resolveOfficialDomain(
  university: Record<string, any> | null | undefined
): { url: string; domain: string } | null {
  if (!university) return null;
  for (const [camel, snake] of URL_CANDIDATES) {
    const raw = university[camel] ?? university[snake];
    if (typeof raw !== "string" || !raw.trim()) continue;
    let candidate = raw.trim();
    // Tolerate protocol-relative URLs ("//www.imperial.ac.uk/…").
    if (candidate.startsWith("//")) candidate = `https:${candidate}`;
    if (!/^https?:\/\//i.test(candidate)) continue;
    try {
      const url = new URL(candidate);
      const host = normalizeDomain(url.hostname);
      if (!host || isThirdPartyHost(host)) continue;
      return { url: url.toString(), domain: host };
    } catch {
      continue; // malformed URL — try the next candidate
    }
  }
  return null;
}

const NAME_STOPWORDS = new Set([
  "the", "of", "and", "at", "for", "in", "university", "universities",
  "college", "institute", "institut", "institution", "technologie",
  "technology", "technical", "school", "state", "national", "international",
  "london", "california", "new", "york", "toronto", "singapore",
]);

/**
 * Generic domain discovery from search results (only used when the DB row
 * has NO usable URL). Hostname tokens are matched against tokens of the
 * university name; .edu / .ac.* TLDs are preferred. Returns null when no
 * plausible domain can be found.
 */
export function pickOfficialDomainFromSearch(
  results: { url: string; title?: string }[],
  universityName: string
): { url: string; domain: string } | null {
  if (!results || results.length === 0) return null;

  const tokens = new Set(
    (universityName || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((t) => t.replace(/^-+|-+$/g, ""))
      .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t))
  );

  const scored: { url: string; domain: string; score: number; matchedTokens: number }[] = [];
  for (const r of results) {
    try {
      const url = new URL(r.url);
      const host = normalizeDomain(url.hostname);
      if (!host || isThirdPartyHost(host)) continue;
      const hostParts = host.split(".").filter((p) => p !== "www" && p !== "ac" && p !== "edu");
      const matchedTokens = hostParts.filter((p) => tokens.has(p)).length;
      const tld = host.split(".").pop() || "";
      // .edu / .ac.<cc> strongly indicates an official academic domain.
      const eduBonus = tld === "edu" || tld === "ac" ? 6 : 0;
      const score = matchedTokens * 10 + eduBonus + (hostParts.length >= 2 ? 1 : 0);
      scored.push({ url: url.toString(), domain: host, score, matchedTokens });
    } catch {
      continue; // malformed result URL
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  // Require a name-token match, or fall back to the best .edu/.ac.* result
  // (still flagged for human review by the caller).
  if (best.matchedTokens === 0 && !/\.(edu|ac)(\.|$)/.test(best.domain)) return null;
  return { url: best.url, domain: best.domain };
}
