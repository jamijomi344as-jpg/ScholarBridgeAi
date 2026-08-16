/**
 * Research-source URL/content filtering (spec §3D, §21, §23).
 *
 * Only real research sources may be stored in `sources` or used as evidence:
 *  - HTML pages
 *  - official PDFs
 *  - official document pages
 *
 * Static assets are rejected: fonts (.woff/.woff2/.ttf/.otf), stylesheets
 * (.css), scripts (.js/.mjs/.map), images (.png/.jpg/.jpeg/.gif/.svg/.ico/
 * .webp/.avif), media, archives, tracking/analytics endpoints and static
 * asset paths (assets/, fonts/, stylesheets/, static/, media/, ...).
 */

const STATIC_EXTENSIONS = new Set([
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".css", ".scss", ".sass", ".less",
  ".js", ".mjs", ".cjs", ".map",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif", ".bmp",
  ".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg",
  ".zip", ".gz", ".tar", ".rar", ".7z", ".exe", ".dmg", ".apk", ".bin",
  ".json", ".webmanifest", ".xml", ".rss", ".atom", ".txt" /* .txt is not a page */,
]);

/** Path segments that indicate static assets even without a known extension. */
const STATIC_PATH_SEGMENTS = [
  "/assets/",
  "/fonts/",
  "/font/",
  "/stylesheets/",
  "/styles/",
  "/css/",
  "/js/",
  "/javascript/",
  "/scripts/",
  "/media/",
  "/images/",
  "/img/",
  "/image/",
  "/static/",
  "/static-assets/",
  "/favicon",
];

/** Tracking / analytics endpoints (path-based). */
const TRACKING_PATH_RE = /(^|\/)(track|tracking|analytics|pixel|beacon|collect|ingest|telemetry|sp\.php|gtm\.js|e\.html)(\/|$|\.)/i;

/** File extension of a URL path (lowercase, includes the dot), or null. */
export function urlExtension(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const m = /\.([a-z0-9]+)$/i.exec(path);
    return m ? `.${m[1].toLowerCase()}` : null;
  } catch {
    return null;
  }
}

/** Reason the URL is rejected as a research source, or null when acceptable. */
export function rejectSourceReason(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "not a valid URL";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "not an HTTP(S) URL";

  const ext = urlExtension(url);
  if (ext && STATIC_EXTENSIONS.has(ext)) return `static asset (${ext})`;

  const path = u.pathname.toLowerCase();
  for (const seg of STATIC_PATH_SEGMENTS) {
    if (path.includes(seg)) return `static asset path (${seg})`;
  }
  if (TRACKING_PATH_RE.test(path)) return "tracking/analytics endpoint";

  // A bare query string pointing at an asset (e.g. ?file=icon.woff2).
  if (u.search) {
    const qExt = /[?&](?:file|src|asset|resource)=([^&#]+)/i.exec(u.search);
    if (qExt) {
      const e = urlExtension(decodeURIComponent(qExt[1]));
      if (e && STATIC_EXTENSIONS.has(e)) return `static asset in query (${e})`;
    }
  }
  return null;
}

/** True when the URL is acceptable as a research source (HTML page or PDF). */
export function isResearchSourceUrl(url: string): boolean {
  return rejectSourceReason(url) === null;
}

/**
 * Content-type gate: a fetched response is a research page only when it is
 * HTML/PDF/text. Fonts, stylesheets, scripts and images are never pages.
 */
export function isResearchContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return true; // unknown — allow, other checks apply
  const ct = contentType.toLowerCase();
  return (
    ct.includes("text/html") ||
    ct.includes("application/xhtml+xml") ||
    ct.includes("application/pdf") ||
    ct.includes("text/plain")
  );
}
