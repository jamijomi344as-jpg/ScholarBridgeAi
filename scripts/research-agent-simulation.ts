/**
 * Offline DRY-RUN simulation — Imperial College London (id=23).
 *
 * ISSUES 1–4 verification: exercises the EXACT production functions
 * (resolveOfficialDomain, DirectFetchProvider, classifyLink,
 * rejectSourceReason, extractLinks, extractMoney, decideUniversityFields /
 * compareAndDecide) against Imperial-shaped fixtures that mirror the
 * current Supabase row (annual_tuition=45500 GBP) and the real homepage
 * asset URLs the user reported (woff/woff2/css).
 *
 * Honest limits: NO network egress and NO Supabase credentials in this
 * sandbox — pages are fixtures, DB state is a fixture. No writes anywhere
 * (dry-run semantics).
 */
import {
  resolveOfficialDomain,
} from "../src/lib/research-agent/domain";
import { createSearchProvider } from "../src/lib/research-agent/providers";
import { extractLinks, htmlToText, sleep } from "../src/lib/research-agent/fetch";
import { classifyLink } from "../src/lib/research-agent/extract";
import { extractMoney } from "../src/lib/research-agent/extract";
import { rejectSourceReason, isResearchSourceUrl } from "../src/lib/research-agent/urlFilter";
import { decideUniversityFields } from "../src/lib/research-agent/persist";
import { toNumber, normalizeCurrency } from "../src/lib/research-agent/normalize";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`);
}

// ---------- Fixtures ----------
// Mirrors the real Supabase row (Drizzle camelCase keys) for Imperial id=23.
const CURRENT = {
  university: {
    id: 23,
    name: "Imperial College London",
    officialWebsiteUrl: "https://www.imperial.ac.uk/",
    websiteUrl: "https://www.imperial.ac.uk/",
    admissionsUrl: "https://www.imperial.ac.uk/study/apply/undergraduate/",
    internationalAdmissionsUrl: "https://www.imperial.ac.uk/study/international-students/",
    undergraduateAdmissionsUrl: "https://www.imperial.ac.uk/study/apply/undergraduate/",
    applicationUrl: "https://www.ucas.com/",
    annualTuition: 45500,
    tuitionCurrency: "GBP",
    tuitionPeriod: "year",
    annualLivingEst: null,
    livingCostCurrency: null,
    livingCostPeriod: null,
    accommodationCost: null,
    accommodationCostCurrency: null,
    accommodationCostPeriod: null,
    applicationFee: null,
    applicationFeeCurrency: null,
    foundedYear: null,
    acceptanceRate: null,
    internationalStudentsCount: null,
    internationalStudentsPercentage: null,
    verificationStatus: "verified",
  },
  programs: [] as any[],
  cycles: [] as any[],
  scholarships: [] as any[],
  sourceUrls: new Set<string>(),
};

// The exact asset URLs the user reported from the real Imperial dry run.
const ASSET_URLS = [
  "https://imperial.ac.uk/assets/website/fonts/icons/fonts/imperial-icons.woff?h=abc123",
  "https://imperial.ac.uk/assets/website/fonts/imperial-sans/ImperialText-VF.woff2",
  "https://imperial.ac.uk/assets/website/stylesheets/css/screen.2.4.11.css",
];

const HOME = `<!doctype html><html><head>
<link rel="stylesheet" href="${ASSET_URLS[2]}">
<link rel="preload" href="${ASSET_URLS[0]}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${ASSET_URLS[1]}" as="font" type="font/woff2" crossorigin>
</head><body>
<a href="/study/apply/undergraduate/">Undergraduate admissions</a>
<a href="/study/international-students/">International students</a>
<a href="/study/fees-and-funding/">Tuition fees</a>
<a href="/study/fees-and-funding/scholarships/">Scholarships and funding</a>
<a href="/study/apply/">How to apply</a>
<a href="/study/entry-requirements/">Entry requirements</a>
<a href="/study/accommodation/">Accommodation and living costs</a>
<a href="/study/accommodation/halls/">Accommodation options</a>
<a href="/assets/website/media/logo.png">logo</a>
<a href="/analytics/pixel.gif">pixel</a>
<a href="/programmes/">Our programmes</a>
</body></html>`;

const TUITION_PAGE = `<html><body><main>
<h1>Undergraduate tuition fees</h1>
<p>For 2026-27 entry, the annual tuition fee for undergraduate programmes is £45,500 per year.</p>
<p>Tuition fees are reviewed each year.</p>
</main></body></html>`;

const LIVING_PAGE = `<html><body><main>
<h1>Living costs in London</h1>
<p>We estimate annual living costs of £14,200 per year including food, transport and bills.</p>
</main></body></html>`;

const ACCOMMODATION_PAGE = `<html><body><main>
<h1>Accommodation</h1>
<p>On-campus accommodation costs £11,800 per year for a standard en-suite room.</p>
</main></body></html>`;

const FIXTURE_PAGES: Record<string, string> = {
  "https://imperial.ac.uk/": HOME,
  "https://www.imperial.ac.uk/": HOME,
  "https://imperial.ac.uk/study/fees-and-funding/": TUITION_PAGE,
  "https://imperial.ac.uk/study/accommodation/": LIVING_PAGE,
  "https://imperial.ac.uk/study/accommodation/halls/": ACCOMMODATION_PAGE,
};

const fetchPage = async (url: string): Promise<string | null> =>
  FIXTURE_PAGES[url] ?? null;

async function main() {
  // ---- STEP A/B: domain resolution ----
  const resolved = resolveOfficialDomain(CURRENT.university);
  console.log("=== STEP B: official domain ===");
  check("domain", resolved?.domain, "imperial.ac.uk");
  const domain = resolved!.domain;

  // ---- STEP C: discovery (keyword loop + homepage scan) ----
  const provider = createSearchProvider(fetchPage, [domain]);
  const wanted = ["admissions", "international", "undergraduate", "tuition", "scholarship", "apply", "requirements", "accommodation"];
  const discovered: { url: string; title: string; type: string }[] = [];
  const rejectedSources: { url: string; reason: string }[] = [];
  const seen = new Set<string>();

  console.log("\n=== STEP C: page discovery + strict source filtering ===");
  for (const kw of wanted) {
    const results = await provider.search(`site:${domain} | ${kw}`);
    for (const r of results) {
      if (seen.has(r.url)) continue;
      const reason = rejectSourceReason(r.url);
      if (reason) {
        seen.add(r.url);
        rejectedSources.push({ url: r.url, reason });
        continue;
      }
      seen.add(r.url);
      discovered.push({ url: r.url, title: r.title || kw, type: classifyLink(r.url, r.title) });
    }
    await sleep(10);
  }
  const homeHtml = await fetchPage(`https://${domain}/`);
  if (homeHtml) {
    // Homepage itself is always an official_homepage research page.
    if (!seen.has(`https://${domain}/`)) {
      seen.add(`https://${domain}/`);
      discovered.unshift({ url: `https://${domain}/`, title: "Imperial College London official homepage", type: "homepage" });
    }
    for (const link of extractLinks(homeHtml, `https://${domain}/`)) {
      if (seen.has(link)) continue;
      const reason = rejectSourceReason(link);
      if (reason) {
        seen.add(link);
        rejectedSources.push({ url: link, reason });
        continue;
      }
      seen.add(link);
      discovered.push({ url: link, title: link, type: classifyLink(link, "") });
    }
  }

  console.log(`  Valid pages discovered (${discovered.length}):`);
  for (const d of discovered) console.log(`    - [${d.type}] ${d.url}`);
  console.log(`  Rejected sources (${rejectedSources.length}):`);
  for (const r of rejectedSources) console.log(`    - ${r.url}  (${r.reason})`);

  // Assertions ISSUE 1/4/5
  check("ZERO font/css/image sources in valid list", discovered.some((d) => !isResearchSourceUrl(d.url)), false);
  check("rejected woff", rejectedSources.some((r) => r.url.includes("imperial-icons.woff")), true);
  check("rejected woff2", rejectedSources.some((r) => r.url.includes("ImperialText-VF.woff2")), true);
  check("rejected css", rejectedSources.some((r) => r.url.includes("screen.2.4.11.css")), true);
  check("rejected png", rejectedSources.some((r) => r.url.includes("logo.png")), true);
  check("rejected tracking pixel", rejectedSources.some((r) => r.url.includes("pixel.gif")), true);
  const types = discovered.map((d) => d.type).sort();
  check("page categories are meaningful (no 'other' spam)", types.includes("other"), false);
  check("homepage category exists", types.includes("homepage"), true);
  check("admissions category exists", types.includes("admissions"), true);
  check("international category exists", types.includes("international"), true);
  check("tuition category exists", types.includes("tuition"), true);
  check("scholarship category exists", types.includes("scholarship"), true);
  check("deadline category exists", types.includes("deadline"), true);
  check("requirements category exists", types.includes("requirements"), true);
  check("program category exists", types.includes("program"), true);

  // ---- STEP D/E: fetch + extract (regex only, like dry-run without AI key) ----
  console.log("\n=== STEP E: extraction (fixture pages) ===");
  const evidence: any[] = [];
  for (const d of discovered) {
    const html = await fetchPage(d.url);
    if (!html) continue;
    const text = htmlToText(html);
    if (text.length < 40) continue;
    const ctx = { url: d.url, title: d.title || d.url, sourceType: `official_${d.type}` };
    if (d.type === "tuition") {
      const t = extractMoney(text, ctx, "annual_tuition", "year", /tuition|fee/);
      if (t) evidence.push(t);
    }
    if (d.type === "living_costs") {
      const living = extractMoney(text, ctx, "annual_living_est", "year", /living|maintenance/);
      if (living) evidence.push({ ...living, field: "annual_living_est" });
      const acc = extractMoney(text, ctx, "accommodation_cost", "year", /accommodation|housing|room/);
      if (acc) evidence.push({ ...acc, field: "accommodation_cost" });
    }
  }
  const best = (field: string) =>
    evidence.filter((e) => e.field === field).sort((a, b) => b.confidence - a.confidence)[0];
  const tBest = best("annual_tuition");
  const lBest = best("annual_living_est");
  const aBest = best("accommodation_cost");
  check("annual_tuition extracted", tBest ? toNumber(tBest.value) : null, 45500);
  check("annual_tuition currency", tBest?.currency, "GBP");
  check("annual_living_est extracted", lBest ? toNumber(lBest.value) : null, 14200);
  check("accommodation_cost extracted", aBest ? toNumber(aBest.value) : null, 11800);
  check("living est source is the living-costs page", lBest?.sourceUrl, "https://imperial.ac.uk/study/accommodation/");
  check("accommodation source is the accommodation page", aBest?.sourceUrl, "https://imperial.ac.uk/study/accommodation/halls/");

  // ---- Decision step (ISSUE 2/3): exact compare against fixture DB ----
  console.log("\n=== DECISION STEP: compare with DB (CASE A–E) ===");
  const uniExtract = {
    foundedYear: undefined as number | undefined,
    acceptanceRate: undefined as number | undefined,
    annualTuition: toNumber(best("annual_tuition")?.value) ?? undefined,
    tuitionCurrency: normalizeCurrency(best("annual_tuition")?.currency) ?? undefined,
    annualLivingEst: toNumber(best("annual_living_est")?.value) ?? undefined,
    livingCostCurrency: normalizeCurrency(best("annual_living_est")?.currency) ?? undefined,
    accommodationCost: toNumber(best("accommodation_cost")?.value) ?? undefined,
    accommodationCostCurrency: normalizeCurrency(best("accommodation_cost")?.currency) ?? undefined,
    applicationFee: undefined as number | undefined,
    applicationFeeCurrency: undefined as string | undefined,
  };
  const decisions = decideUniversityFields(uniExtract as any, evidence as any, CURRENT as any);
  const updated = decisions.filter((d) => d.action === "write" || d.action === "update");
  const skipped = decisions.filter((d) => d.action === "skip");
  const review = decisions.filter((d) => d.action === "review");

  for (const d of decisions) {
    console.log(
      `  ${d.field}: DB=${String(d.dbValue ?? "NULL")}${d.currency ? ` ${d.currency}` : ""} → new=${String(d.newValue ?? "NULL")}${d.currency ? ` ${d.currency}` : ""} | ${d.action.toUpperCase()} | conf=${d.confidence} | ${d.sourceUrl} | ${d.reason}`
    );
  }

  // ISSUE 2 assertions
  check("annual_tuition decision = SKIP (unchanged)", decisions.find((d) => d.field === "annual_tuition")?.action, "skip");
  check("annual_tuition reason mentions unchanged", (decisions.find((d) => d.field === "annual_tuition")?.reason || "").toLowerCase().includes("unchanged"), true);
  check("annual_living_est decision = WRITE (DB NULL)", decisions.find((d) => d.field === "annual_living_est")?.action, "write");
  check("accommodation_cost decision = WRITE (DB NULL)", decisions.find((d) => d.field === "accommodation_cost")?.action, "write");
  check("only 2 fields updated (NOT 3)", updated.map((d) => d.field).sort(), ["accommodation_cost", "annual_living_est"]);
  check("every update has a source URL", updated.every((d) => /^https?:/.test(d.sourceUrl)), true);
  check("every update has confidence", updated.every((d) => d.confidence != null && d.confidence > 0), true);
  check("skipped contains annual_tuition", skipped.map((d) => d.field), ["annual_tuition"]);
  check("no review decisions", review.length, 0);

  console.log(`\n${failures === 0 ? "ALL SIMULATION TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
