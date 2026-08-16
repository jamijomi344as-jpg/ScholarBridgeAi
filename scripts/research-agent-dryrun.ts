/**
 * Offline dry-run harness for the research agent (BUG #2 verification).
 *
 * - Fixtures mirror the real Supabase rows for Imperial (23), MIT (41),
 *   Stanford (45), Oxford (13) — Drizzle returns camelCase property names.
 * - Tests official-domain resolution, www/bare normalization, UCAS
 *   exclusion, and the search-based fallback (fixture results).
 * - Optionally performs LIVE page discovery against the resolved official
 *   domain (network fetch; no Supabase writes, no AI key needed — aiExtract
 *   falls back to regex when OPENROUTER_API_KEY is unset). When the sandbox
 *   has no outbound network, the live section is skipped and reported.
 */
import {
  resolveOfficialDomain,
  pickOfficialDomainFromSearch,
  isSameDomain,
  normalizeDomain,
} from "../src/lib/research-agent/domain";
import { createSearchProvider } from "../src/lib/research-agent/providers";
import { fetchPageText, htmlToText, extractLinks, sleep } from "../src/lib/research-agent/fetch";
import {
  classifyLink,
  extractMoney,
  extractNumberReq,
} from "../src/lib/research-agent/extract";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`);
}

// ---------- 1. Official-domain resolution from DB rows ----------
const FIXTURES: { id: number; name: string; row: Record<string, any>; expected: string }[] = [
  {
    id: 23,
    name: "Imperial College London",
    expected: "imperial.ac.uk",
    row: {
      name: "Imperial College London",
      officialWebsiteUrl: "https://www.imperial.ac.uk/",
      websiteUrl: "https://www.imperial.ac.uk/",
      admissionsUrl: "https://www.imperial.ac.uk/study/apply/undergraduate/",
      internationalAdmissionsUrl: "https://www.imperial.ac.uk/study/international-students/",
      undergraduateAdmissionsUrl: "https://www.imperial.ac.uk/study/apply/undergraduate/",
      applicationUrl: "https://www.ucas.com/",
    },
  },
  {
    id: 41,
    name: "Massachusetts Institute of Technology",
    expected: "mit.edu",
    row: {
      name: "Massachusetts Institute of Technology",
      officialWebsiteUrl: "https://www.mit.edu/",
      websiteUrl: "https://www.mit.edu/",
      admissionsUrl: "https://mitadmissions.org/",
      applicationUrl: null,
    },
  },
  {
    id: 45,
    name: "Stanford University",
    expected: "stanford.edu",
    row: {
      name: "Stanford University",
      websiteUrl: "https://www.stanford.edu/",
      admissionsUrl: "https://admission.stanford.edu/",
      applicationUrl: null,
    },
  },
  {
    id: 13,
    name: "University of Oxford",
    expected: "ox.ac.uk",
    row: {
      name: "University of Oxford",
      websiteUrl: "https://www.ox.ac.uk/",
      admissionsUrl: "https://www.ox.ac.uk/admissions/undergraduate",
      applicationUrl: null,
    },
  },
];

async function main() {
  console.log("=== TEST 1: resolveOfficialDomain (camelCase Drizzle rows) ===");
  for (const f of FIXTURES) {
    const r = resolveOfficialDomain(f.row);
    console.log(`  [${f.id}] ${f.name}`);
    if (!r) {
      console.log(`  FAIL  ${f.name}: resolved null — expected ${f.expected}`);
      failures++;
      continue;
    }
    check(`${f.name} domain`, r.domain, f.expected);
    check(`${f.name} resolved URL`, r.url, f.row.officialWebsiteUrl || f.row.websiteUrl);
  }

  console.log("\n=== TEST 2: snake_case rows (raw SQL shape) ===");
  const snakeRow = {
    name: "Imperial College London",
    official_website_url: "https://www.imperial.ac.uk/",
    website_url: "https://www.imperial.ac.uk/",
    admissions_url: "https://www.imperial.ac.uk/study/apply/undergraduate/",
    international_admissions_url: "https://www.imperial.ac.uk/study/international-students/",
    undergraduate_admissions_url: "https://www.imperial.ac.uk/study/apply/undergraduate/",
    application_url: "https://www.ucas.com/",
  };
  check("snake_case Imperial domain", resolveOfficialDomain(snakeRow)?.domain, "imperial.ac.uk");

  console.log("\n=== TEST 3: UCAS / third-party exclusion ===");
  const ucasOnly = { name: "X University", applicationUrl: "https://www.ucas.com/" };
  check("UCAS-only row → null (search fallback engages)", resolveOfficialDomain(ucasOnly), null);

  console.log("\n=== TEST 4: www/bare normalization ===");
  check("normalizeDomain(www.imperial.ac.uk)", normalizeDomain("www.imperial.ac.uk"), "imperial.ac.uk");
  check("normalizeDomain(IMPERIAL.AC.UK.)", normalizeDomain("IMPERIAL.AC.UK."), "imperial.ac.uk");
  check("isSameDomain(https://www.imperial.ac.uk/x, imperial.ac.uk)", isSameDomain("https://www.imperial.ac.uk/x", "imperial.ac.uk"), true);
  check("isSameDomain(https://ox.ac.uk, www.ox.ac.uk)", isSameDomain("https://ox.ac.uk", "www.ox.ac.uk"), true);
  check("isSameDomain(https://stanford.edu, imperial.ac.uk)", isSameDomain("https://stanford.edu", "imperial.ac.uk"), false);

  console.log("\n=== TEST 5: search fallback (fixture results, no DB URLs) ===");
  const oxfordSearch = pickOfficialDomainFromSearch(
    [
      { url: "https://en.wikipedia.org/wiki/University_of_Oxford", title: "University of Oxford - Wikipedia" },
      { url: "https://www.ox.ac.uk/", title: "University of Oxford" },
      { url: "https://www.timeshighereducation.com/world-university-rankings/university-oxford", title: "THE ranking" },
    ],
    "University of Oxford"
  );
  check("Oxford search fallback domain", oxfordSearch?.domain, "ox.ac.uk");

  const mitSearch = pickOfficialDomainFromSearch(
    [
      { url: "https://en.wikipedia.org/wiki/Massachusetts_Institute_of_Technology", title: "MIT - Wikipedia" },
      { url: "https://www.mit.edu/", title: "MIT - Massachusetts Institute of Technology" },
    ],
    "Massachusetts Institute of Technology"
  );
  check("MIT search fallback domain", mitSearch?.domain, "mit.edu");

  const noneSearch = pickOfficialDomainFromSearch(
    [{ url: "https://en.wikipedia.org/wiki/Test", title: "Test" }],
    "Some Unknown College"
  );
  check("No plausible domain → null", noneSearch, null);

  // ---------- 6. LIVE discovery against the resolved official domain ----------
  console.log("\n=== TEST 6: LIVE dry-run page discovery — Imperial College London ===");
  const imperial = resolveOfficialDomain(FIXTURES[0].row);
  if (!imperial) {
    console.log("  FAIL  Imperial resolution returned null — cannot continue live test");
    failures++;
  } else {
    console.log(`  Resolved domain: ${imperial.domain}`);
    const provider = createSearchProvider(fetchPageText, [imperial.domain]);
    const wanted = ["admissions", "international", "undergraduate", "tuition", "scholarship", "apply", "requirements", "accommodation"];
    const discovered = new Map<string, { title: string; type: string }>();
    for (const kw of wanted) {
      try {
        const results = await provider.search(`site:${imperial.domain} | ${kw}`);
        for (const r of results) {
          if (!discovered.has(r.url)) discovered.set(r.url, { title: r.title, type: classifyLink(r.url, r.title) });
        }
      } catch (err: any) {
        console.log(`  WARN  keyword "${kw}" failed: ${err?.message}`);
      }
      await sleep(700);
    }

    if (discovered.size === 0) {
      console.log("  SKIP  no pages discovered — no outbound network egress from this sandbox (page discovery must run on Render or a networked machine).");
    } else {
      console.log(`  Discovered ${discovered.size} official same-domain pages:`);
      let i = 0;
      for (const [url, info] of discovered) {
        if (i++ >= 20) break;
        console.log(`    - [${info.type || "page"}] ${url}  ${info.title ? "| " + info.title.slice(0, 70) : ""}`);
      }
    }

    // Homepage scan (www/bare tolerance check)
    console.log("\n  Homepage link scan (www/bare tolerance):");
    const homeHtml = await fetchPageText(`https://${imperial.domain}/`);
    if (homeHtml) {
      const links = extractLinks(homeHtml, `https://${imperial.domain}/`);
      const wwwLinks = links.filter((l) => l.includes("www." + imperial.domain));
      console.log(`    total same-domain links: ${links.length}, of which www-prefixed kept: ${wwwLinks.length}`);
      check("www-prefixed links kept by extractLinks", wwwLinks.length > 0, true);
    } else {
      console.log("    SKIP  homepage fetch returned null — no outbound network egress from this sandbox.");
    }

    // Fetch one discovered page and run regex extraction (no AI key needed)
    const target = discovered.has("https://www.imperial.ac.uk/study/apply/undergraduate/")
      ? "https://www.imperial.ac.uk/study/apply/undergraduate/"
      : [...discovered.keys()].find((u) => /tuition|fee|apply|undergraduate/i.test(u)) ?? [...discovered.keys()][0];
    if (!target) {
      console.log("  SKIP  extraction smoke test — no page to fetch (no egress).");
    } else {
      console.log(`\n  Extraction smoke test on: ${target}`);
      const html = await fetchPageText(target);
      if (html) {
        const text = htmlToText(html);
        const ctx = { url: target, title: "Imperial admissions page", sourceType: "official_admissions" };
        const fee = extractMoney(text, ctx, "application_fee", "application");
        const ielts = extractNumberReq(text, ctx, "min_ielts", "IELTS");
        const toefl = extractNumberReq(text, ctx, "min_toefl", "TOEFL");
        if (fee) console.log(`    extracted application_fee: ${JSON.stringify({ value: fee.value, currency: fee.currency, snippet: fee.exactEvidence.slice(0, 80) })}`);
        else console.log("    no application_fee pattern found on this page (expected — page may not list fees)");
        if (ielts) console.log(`    extracted min_ielts: ${JSON.stringify({ value: ielts.value, snippet: ielts.exactEvidence.slice(0, 80) })}`);
        else console.log("    no IELTS pattern found on this page");
        void toefl;
      }
    }
  }

  console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
