/**
 * Offline DRY-RUN simulation — Imperial College London (id=23).
 *
 * Issues 1–7 verification: exercises the EXACT production functions
 * (resolveOfficialDomain, DirectFetchProvider, classifyLink,
 * validateProgramPage, findExistingProgram, rejectSourceReason,
 * extractLinks, extractMoney, decideUniversityFields / compareAndDecide)
 * against Imperial-shaped fixtures that mirror the real Supabase row
 * (annual_tuition=45500 GBP, existing program "Computing BEng") and the
 * real reported asset URLs + generic hub pages.
 *
 * Honest limits: NO network egress and NO Supabase credentials in this
 * sandbox — pages and DB state are fixtures. No writes anywhere.
 */
import { resolveOfficialDomain } from "../src/lib/research-agent/domain";
import { createSearchProvider } from "../src/lib/research-agent/providers";
import { extractLinks, htmlToText, sleep } from "../src/lib/research-agent/fetch";
import { classifyLink, validateProgramPage, extractMoney } from "../src/lib/research-agent/extract";
import { rejectSourceReason, isResearchSourceUrl } from "../src/lib/research-agent/urlFilter";
import { decideUniversityFields, findExistingProgram } from "../src/lib/research-agent/persist";
import { toNumber, normalizeCurrency } from "../src/lib/research-agent/normalize";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`);
}

// ---------- Fixtures ----------
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
  programs: [
    {
      id: 501,
      universityId: 23,
      name: "Computing BEng",
      degree: "Bachelor",
      field: "Computing",
      tuitionAmount: 45500, // matches what the official tuition page says
      tuitionCurrency: "GBP",
      tuitionPeriod: "year",
      programUrl: "https://www.imperial.ac.uk/study/courses/undergraduate/computing-beng/",
      isVerified: false,
    },
  ],
  cycles: [] as any[],
  scholarships: [] as any[],
  sourceUrls: new Set<string>(),
};

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
<a href="/study/">Study at Imperial</a>
<a href="/study/courses/">Courses</a>
<a href="/faculties-and-departments/">Faculties and departments</a>
<a href="/research-and-innovation/">Research and innovation</a>
<a href="/about-the-site/accessibility/">Accessibility</a>
<a href="/programmes/">Our programmes</a>
<a href="/study/courses/undergraduate/computing-beng/">Computing BEng</a>
<a href="/assets/website/media/logo.png">logo</a>
<a href="/analytics/pixel.gif">pixel</a>
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

const COMPUTING_BENG_PAGE = `<html><body><main>
<h1>Computing BEng | Study | Imperial College London</h1>
<p>Our Computing BEng degree combines computer science, mathematics and engineering.</p>
<p>This three-year undergraduate programme leads to a BEng degree.</p>
</main></body></html>`;

const FIXTURE_PAGES: Record<string, string> = {
  "https://imperial.ac.uk/": HOME,
  "https://www.imperial.ac.uk/": HOME,
  "https://imperial.ac.uk/study/fees-and-funding/": TUITION_PAGE,
  "https://imperial.ac.uk/study/accommodation/": LIVING_PAGE,
  "https://imperial.ac.uk/study/accommodation/halls/": ACCOMMODATION_PAGE,
  "https://imperial.ac.uk/study/courses/undergraduate/computing-beng/": COMPUTING_BENG_PAGE,
};

const fetchPage = async (url: string): Promise<string | null> =>
  FIXTURE_PAGES[url] ?? null;

async function main() {
  const resolved = resolveOfficialDomain(CURRENT.university);
  console.log("=== STEP B: official domain ===");
  check("domain", resolved?.domain, "imperial.ac.uk");
  const domain = resolved!.domain;

  // ---- STEP C: discovery ----
  const provider = createSearchProvider(fetchPage, [domain]);
  const wanted = ["admissions", "international", "undergraduate", "tuition", "scholarship", "apply", "requirements", "accommodation", "program"];
  const discovered: { url: string; title: string; type: string }[] = [];
  const rejectedSources: { url: string; reason: string }[] = [];
  const seen = new Set<string>();

  console.log("\n=== STEP C: page discovery + strict source filtering ===");
  for (const kw of wanted) {
    const results = await provider.search(`site:${domain} | ${kw}`);
    for (const r of results) {
      if (seen.has(r.url)) continue;
      const reason = rejectSourceReason(r.url);
      if (reason) { seen.add(r.url); rejectedSources.push({ url: r.url, reason }); continue; }
      seen.add(r.url);
      discovered.push({ url: r.url, title: r.title || kw, type: classifyLink(r.url, r.title) });
    }
    await sleep(10);
  }
  const homeHtml = await fetchPage(`https://${domain}/`);
  if (homeHtml) {
    if (!seen.has(`https://${domain}/`)) {
      seen.add(`https://${domain}/`);
      discovered.unshift({ url: `https://${domain}/`, title: "Imperial College London official homepage", type: "homepage" });
    }
    for (const link of extractLinks(homeHtml, `https://${domain}/`)) {
      if (seen.has(link)) continue;
      const reason = rejectSourceReason(link);
      if (reason) { seen.add(link); rejectedSources.push({ url: link, reason }); continue; }
      seen.add(link);
      discovered.push({ url: link, title: link, type: classifyLink(link, "") });
    }
  }

  console.log(`  Valid pages discovered (${discovered.length}):`);
  for (const d of discovered) console.log(`    - [${d.type}] ${d.url}`);
  console.log(`  Rejected sources (${rejectedSources.length}):`);
  for (const r of rejectedSources) console.log(`    - ${r.url}  (${r.reason})`);

  // ---- STEP D/E: fetch + extract ----
  console.log("\n=== STEP E: extraction (fixture pages) ===");
  const pages: { url: string; title: string; type: string; text: string }[] = [];
  for (const d of discovered) {
    const html = await fetchPage(d.url);
    if (!html) continue;
    const text = htmlToText(html);
    if (text.length < 40) continue;
    pages.push({ ...d, text });
  }
  const evidence: any[] = [];
  const pageTypeIs = (p: { type: string }, allowed: string[]) => allowed.includes(p.type) || p.type === "other";
  for (const p of pages) {
    const ctx = { url: p.url, title: p.title || p.url, sourceType: `official_${p.type}` };
    if (pageTypeIs(p, ["tuition"])) {
      const t = extractMoney(p.text, ctx, "annual_tuition", "year", /tuition|fee/);
      if (t) evidence.push(t);
    }
    if (pageTypeIs(p, ["living_costs"])) {
      const living = extractMoney(p.text, ctx, "annual_living_est", "year", /living|maintenance/);
      if (living) evidence.push({ ...living, field: "annual_living_est" });
      const acc = extractMoney(p.text, ctx, "accommodation_cost", "year", /accommodation|housing|room/);
      if (acc) evidence.push({ ...acc, field: "accommodation_cost" });
    }
  }
  const best = (field: string) =>
    evidence.filter((e) => e.field === field).sort((a, b) => b.confidence - a.confidence)[0];
  check("annual_tuition extracted", toNumber(best("annual_tuition")?.value), 45500);
  check("annual_tuition currency", best("annual_tuition")?.currency, "GBP");
  check("annual_living_est extracted", toNumber(best("annual_living_est")?.value), 14200);
  check("accommodation_cost extracted", toNumber(best("accommodation_cost")?.value), 11800);

  // ---- Program handling (Issues 1–3) ----
  console.log("\n=== PROGRAM HANDLING: validation + dedupe ===");
  const insertedPrograms: string[] = [];
  const programDecisions: any[] = [];
  const programPages = pages.filter((p) => p.type === "program").slice(0, 12);
  for (const p of programPages) {
    const validation = validateProgramPage(p.url, p.title, p.text);
    if (!validation.ok || !validation.name) {
      console.log(`  discovery-only: ${p.url} (${validation.reason})`);
      continue;
    }
    const name = validation.name.slice(0, 120);
    const t = best("annual_tuition");
    const newTuition = t ? toNumber(t.value) ?? undefined : undefined;
    const existing = findExistingProgram(CURRENT.programs, name, p.url);
    if (existing) {
      programDecisions.push({
        entity: "program", field: "name", action: "skip",
        dbValue: existing.name, newValue: name,
        sourceUrl: p.url, reason: "unchanged — already exists",
      });
      const dbTuition = toNumber(existing.tuitionAmount);
      if (t && newTuition != null && dbTuition === newTuition) {
        programDecisions.push({
          entity: "program", field: "annual_tuition", action: "skip",
          dbValue: existing.tuitionAmount, newValue: newTuition,
          currency: t.currency, sourceUrl: t.sourceUrl,
          sourceTitle: t.sourceTitle, sourceType: t.sourceType, confidence: t.confidence,
          reason: "unchanged — tuition identical",
        });
      }
      console.log(`  ${name}: EXISTS → SKIPPED (unchanged) — ${p.url}`);
    } else {
      insertedPrograms.push(name);
      console.log(`  ${name}: NEW → would insert (${p.url})`);
    }
  }

  // ---- Source persistence gating (Issues 4–5, 7) ----
  console.log("\n=== SOURCE PERSISTENCE GATING ===");
  const PERSISTABLE_CATEGORIES = new Set([
    "homepage", "admissions", "international", "program",
    "tuition", "living_costs", "deadline", "requirements", "scholarship",
  ]);
  const pageTextByUrl = new Map(pages.map((p) => [p.url, p.text]));
  const newSources: { url: string; title: string }[] = [];
  const discoveryOnly: { url: string; title: string; type: string; reason: string }[] = [];
  const added = new Set<string>();

  // 1. Evidence-backed sources.
  for (const ev of evidence) {
    if (added.has(ev.sourceUrl)) continue;
    added.add(ev.sourceUrl);
    newSources.push({ url: ev.sourceUrl, title: ev.sourceTitle });
  }
  // 2. High-value discovered pages only.
  for (const d of discovered) {
    if (added.has(d.url)) continue;
    if (!PERSISTABLE_CATEGORIES.has(d.type)) {
      discoveryOnly.push({ url: d.url, title: d.title, type: d.type, reason: "generic navigation page — no useful source category" });
      continue;
    }
    if (d.type === "program") {
      const v = validateProgramPage(d.url, d.title, pageTextByUrl.get(d.url) ?? "");
      if (!v.ok) {
        discoveryOnly.push({ url: d.url, title: d.title, type: d.type, reason: v.reason || "generic hub page" });
        continue;
      }
    }
    added.add(d.url);
    newSources.push({ url: d.url, title: d.title });
  }

  console.log(`  Persisted sources (${newSources.length}):`);
  for (const s of newSources) console.log(`    - ${s.url}`);
  console.log(`  Discovery-only (${discoveryOnly.length}):`);
  for (const s of discoveryOnly) console.log(`    - ${s.url}  (${s.reason})`);

  // ---------- ASSERTIONS ----------
  console.log("\n=== ASSERTIONS ===");
  // Issue 1/2/3: no generic hub programs, existing program deduped.
  check("no program named 'Study'", insertedPrograms.some((n) => /^study$/i.test(n)), false);
  check("no program named 'Courses'", insertedPrograms.some((n) => /^courses?$/i.test(n)), false);
  check("no 'Faculties and departments' program", insertedPrograms.some((n) => /faculties/i.test(n)), false);
  check("no 'Programmes' program", insertedPrograms.some((n) => /^programmes?$/i.test(n)), false);
  check("inserted programs empty (Computing BEng deduped)", insertedPrograms, []);
  const progNameDecision = programDecisions.find((d) => d.entity === "program" && d.field === "name");
  check("Computing BEng name decision = SKIP", progNameDecision?.action, "skip");
  check("Computing BEng old value", progNameDecision?.dbValue, "Computing BEng");
  check("Computing BEng new value", progNameDecision?.newValue, "Computing BEng");
  const progTuitionDecision = programDecisions.find((d) => d.entity === "program" && d.field === "annual_tuition");
  check("Computing BEng tuition decision = SKIP (45500 == 45500)", progTuitionDecision?.action, "skip");
  check("program decision has source URL", progNameDecision?.sourceUrl, "https://imperial.ac.uk/study/courses/undergraduate/computing-beng/");

  // Issue 4/5/7: generic pages discovery-only, program page persisted.
  check("generic /study/ NOT persisted", newSources.some((s) => s.url === "https://imperial.ac.uk/study/"), false);
  check("generic /study/courses/ NOT persisted", newSources.some((s) => /\/study\/courses\/?$/.test(s.url)), false);
  check("faculties page NOT persisted", newSources.some((s) => s.url.includes("faculties-and-departments")), false);
  check("research page NOT persisted", newSources.some((s) => s.url.includes("research-and-innovation")), false);
  check("accessibility page NOT persisted", newSources.some((s) => s.url.includes("accessibility")), false);
  check("program page IS persisted", newSources.some((s) => s.url.includes("computing-beng")), true);
  check("tuition page IS persisted", newSources.some((s) => s.url.includes("fees-and-funding")), true);
  check("homepage IS persisted", newSources.some((s) => s.url === "https://imperial.ac.uk/"), true);
  check("discovery-only includes /study/", discoveryOnly.some((s) => s.url === "https://imperial.ac.uk/study/"), true);
  check("discovery-only includes faculties", discoveryOnly.some((s) => s.url.includes("faculties-and-departments")), true);
  check("discovery-only includes accessibility", discoveryOnly.some((s) => s.url.includes("accessibility")), true);
  check("discovery-only includes research", discoveryOnly.some((s) => s.url.includes("research-and-innovation")), true);

  // Issue 1: zero assets anywhere.
  check("ZERO font/css/image sources", newSources.some((s) => !isResearchSourceUrl(s.url)), false);
  check("rejected woff", rejectedSources.some((r) => r.url.includes("imperial-icons.woff")), true);
  check("rejected woff2", rejectedSources.some((r) => r.url.includes("ImperialText-VF.woff2")), true);
  check("rejected css", rejectedSources.some((r) => r.url.includes("screen.2.4.11.css")), true);

  console.log(`\n${failures === 0 ? "ALL SIMULATION TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
