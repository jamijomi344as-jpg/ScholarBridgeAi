/**
 * Offline DRY-RUN simulation — Imperial College London (id=23).
 *
 * Full acceptance test (issues 1–12): exercises the EXACT production
 * functions (resolveOfficialDomain, DirectFetchProvider, classifyLink,
 * classifyPageByContent, validateProgramPage, findExistingProgram,
 * rejectSourceReason, extractMoney/extractNumberReq/extractDeadline,
 * decideUniversityFields) against a realistic Imperial-shaped site model:
 * homepage → /study/ hub → /study/courses/ hub → Computing BEng page,
 * plus tuition/living/requirements/deadline/scholarship pages and the
 * existing DB state (tuition 45500 GBP, program Computing BEng, cycle
 * 2026-10-15, verified IELTS 7.0, Imperial Inspires scholarship).
 *
 * Honest limits: NO network egress and NO Supabase credentials — pages and
 * DB state are fixtures. No writes anywhere (dry-run semantics).
 */
import { resolveOfficialDomain } from "../src/lib/research-agent/domain";
import { createSearchProvider } from "../src/lib/research-agent/providers";
import { extractLinks, htmlToText, sleep } from "../src/lib/research-agent/fetch";
import {
  classifyLink,
  classifyPageByContent,
  validateProgramPage,
  firstHeading,
  extractMoney,
  extractNumberReq,
  extractDeadline,
} from "../src/lib/research-agent/extract";
import { rejectSourceReason, isResearchSourceUrl } from "../src/lib/research-agent/urlFilter";
import { decideUniversityFields, findExistingProgram } from "../src/lib/research-agent/persist";
import { toNumber, normalizeCurrency, normalizeNameKey, normalizeUrl } from "../src/lib/research-agent/normalize";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`);
}

// ---------- Fixtures: DB state (mirrors real Supabase row) ----------
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
      tuitionAmount: 45500,
      tuitionCurrency: "GBP",
      tuitionPeriod: "year",
      programUrl: "https://www.imperial.ac.uk/study/courses/undergraduate/computing-beng/",
      isVerified: false,
      minIelts: 7.0,
      minToefl: 100,
      ibRequirement: "39 points",
      verificationStatus: "verified",
    },
  ],
  cycles: [
    { id: 601, universityId: 23, academicYear: "2026-27", applicationType: "Regular Decision", deadline: new Date("2026-10-15"), openingDate: new Date("2026-09-01") },
    { id: 602, universityId: 23, academicYear: "2026-27", applicationType: "Regular Decision", deadline: new Date("2027-01-13") },
  ],
  scholarships: [
    { id: 701, title: "Imperial Inspires Scholarship 2027", websiteUrl: "https://www.imperial.ac.uk/study/fees-and-funding/scholarships/", verificationStatus: "verified" },
  ],
  sourceUrls: new Set<string>(),
};

// ---------- Fixtures: site model ----------
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
<a href="/study/">Study</a>
<a href="/research-and-innovation/">Research</a>
<a href="/about-the-site/accessibility/">Accessibility</a>
<a href="/faculties-and-departments/">Faculties and departments</a>
<a href="/study/apply/undergraduate/">Undergraduate admissions</a>
<a href="/study/international-students/">International students</a>
<a href="/study/fees-and-funding/">Tuition fees</a>
<a href="/study/fees-and-funding/scholarships/">Scholarships and funding</a>
<a href="/study/accommodation/">Accommodation and living costs</a>
<a href="/study/accommodation/halls/">Accommodation options</a>
<a href="/study/entry-requirements/">Entry requirements</a>
<a href="/assets/website/media/logo.png">logo</a>
<a href="/analytics/pixel.gif">pixel</a>
</body></html>`;

// Hub chain: /study/ → /study/courses/ → program pages (2-level crawl).
const STUDY_HUB = `<html><body>
<a href="/study/courses/">Courses</a>
<a href="/study/apply/">How to apply</a>
<a href="/study/fees-and-funding/">Tuition fees</a>
</body></html>`;

const COURSES_HUB = `<html><body>
<a href="/study/courses/undergraduate/computing-beng/">Computing BEng</a>
<a href="/study/courses/undergraduate/mechanical-engineering-beng/">Mechanical Engineering BEng</a>
<a href="/study/courses/">All courses</a>
</body></html>`;

const TUITION_PAGE = `<html><body><main>
<h1>Undergraduate tuition fees | Imperial College London</h1>
<p>Tuition fees for 2026-27 entry are published on this page. The annual tuition fee for undergraduate programmes is £45,500 per year. Overseas tuition fees are the same for all undergraduate programmes.</p>
<p>Fees for 2027-28 will be confirmed later.</p>
</main></body></html>`;

const LIVING_PAGE = `<html><body><main>
<h1>Living costs in London | Imperial College London</h1>
<p>Living costs for students in London: we estimate monthly living costs of £1,300–£1,700 per month. Annual living costs are estimated at £14,200 per year.</p>
</main></body></html>`;

const ACCOMMODATION_PAGE = `<html><body><main>
<h1>Accommodation | Imperial College London</h1>
<p>On-campus accommodation costs £11,800 per year for a standard en-suite room. Prices range from £9,000 to £13,000 per year depending on the hall.</p>
</main></body></html>`;

const REQUIREMENTS_PAGE = `<html><body><main>
<h1>Entry requirements | Imperial College London</h1>
<p>English language requirement: IELTS 7.0, TOEFL 100, PTE Academic 65, or Cambridge English Scale 185.</p>
<p>A-levels: AAA including Mathematics. International Baccalaureate: 39 points.</p>
<p>Applicants for Computing BEng are required to sit the TMUA admissions test.</p>
</main></body></html>`;

const APPLY_PAGE = `<html><body><main>
<h1>How to apply for 2027 entry | Imperial College London</h1>
<p>Applications open on 1 September 2026. The UCAS deadline for equal consideration is 15 October 2026, with a further deadline of 13 January 2027. Application fee: £75.</p>
</main></body></html>`;

const SCHOLARSHIP_PAGE = `<html><body><main>
<h1>Imperial Inspires Scholarship 2027 | Imperial College London</h1>
<p>The Imperial Inspires Scholarship supports undergraduate students with financial need. Awards are available up to £5,000 per year.</p>
</main></body></html>`;

const COMPUTING_BENG_PAGE = `<html><body><main>
<h1>Computing BEng | Study | Imperial College London</h1>
<p>Our Computing BEng degree combines computer science, mathematics and engineering. This three-year undergraduate programme leads to a BEng degree.</p>
<p>Tuition fees for this programme are £45,500 per year. Entry requirements: A-levels AAA including Mathematics, IELTS 7.0.</p>
</main></body></html>`;

const FIXTURE_PAGES: Record<string, string> = {
  "https://imperial.ac.uk/": HOME,
  "https://www.imperial.ac.uk/": HOME,
  "https://imperial.ac.uk/study/": STUDY_HUB,
  "https://imperial.ac.uk/study/courses/": COURSES_HUB,
  "https://imperial.ac.uk/study/fees-and-funding/": TUITION_PAGE,
  "https://imperial.ac.uk/study/accommodation/": LIVING_PAGE,
  "https://imperial.ac.uk/study/accommodation/halls/": ACCOMMODATION_PAGE,
  "https://imperial.ac.uk/study/entry-requirements/": REQUIREMENTS_PAGE,
  "https://imperial.ac.uk/study/apply/": APPLY_PAGE,
  "https://imperial.ac.uk/study/fees-and-funding/scholarships/": SCHOLARSHIP_PAGE,
  "https://imperial.ac.uk/study/courses/undergraduate/computing-beng/": COMPUTING_BENG_PAGE,
};

const fetchPage = async (url: string): Promise<string | null> =>
  FIXTURE_PAGES[url] ?? null;

const best = (evidence: any[], field: string) =>
  evidence.filter((e) => e.field === field).sort((a, b) => b.confidence - a.confidence)[0];

async function main() {
  const resolved = resolveOfficialDomain(CURRENT.university);
  console.log("=== STEP B: official domain ===");
  check("domain", resolved?.domain, "imperial.ac.uk");
  const domain = resolved!.domain;

  // ---- STEP C: discovery + hub crawl ----
  const provider = createSearchProvider(fetchPage, [domain]);
  const wanted = ["admissions", "international", "undergraduate", "tuition", "scholarship", "apply", "requirements", "accommodation", "program"];
  const discovered: { url: string; title: string; type: string }[] = [];
  const rejectedSources: { url: string; reason: string }[] = [];
  const seen = new Set<string>();

  console.log("\n=== STEP C: discovery + hub crawl ===");
  for (const kw of wanted) {
    const results = await provider.search(`site:${domain} | ${kw}`);
    for (const r of results) {
      if (seen.has(r.url)) continue;
      const reason = rejectSourceReason(r.url);
      if (reason) { seen.add(r.url); rejectedSources.push({ url: r.url, reason }); continue; }
      seen.add(r.url);
      discovered.push({ url: r.url, title: r.title || kw, type: classifyLink(r.url, r.title) });
    }
    await sleep(5);
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
  // Hub crawl (1 level, queue-based — hubs found while crawling are crawled too).
  const HUB_PATH_RE = /(^|\/)(courses?|programmes?|programs?|degrees?|study)\/?$/;
  const isHub = (url: string) => {
    try { return HUB_PATH_RE.test(new URL(url).pathname) && url !== `https://${domain}/`; } catch { return false; }
  };
  const hubQueue = discovered.filter((d) => isHub(d.url)).slice(0, 4);
  console.log("  hubQueue:", hubQueue.map((d) => d.url));
  const hubCrawled = new Set<string>();
  while (hubQueue.length > 0 && hubCrawled.size < 4) {
    const hub = hubQueue.shift()!;
    if (hubCrawled.has(hub.url)) continue;
    hubCrawled.add(hub.url);
    console.log("  crawling", hub.url);
    const html = await fetchPage(hub.url);
    if (!html) { console.log("    no fixture"); continue; }
    for (const link of extractLinks(html, hub.url)) {
      if (seen.has(link)) continue;
      const reason = rejectSourceReason(link);
      if (reason) { seen.add(link); rejectedSources.push({ url: link, reason }); continue; }
      seen.add(link);
      const type = classifyLink(link, "");
      discovered.push({ url: link, title: link, type });
      if (isHub(link)) hubQueue.push({ url: link, title: link, type });
    }
  }

  console.log("Discovered (" + discovered.length + "):");
  for (const d of discovered) console.log(`    [${d.type}] ${d.url}`);

  // Program-priority ordering (mirrors production).
  discovered.sort((a, b) => {
    const rank = (d: { type: string }) =>
      d.type === "program" ? 0
      : d.type === "tuition" || d.type === "requirements" ? 1
      : d.type === "deadline" || d.type === "scholarship" || d.type === "living_costs" ? 2
      : d.type === "homepage" ? 3 : 4;
    return rank(a) - rank(b);
  });

  // ---- STEP D/E: fetch + reclassify + extract ----
  const pages: { url: string; title: string; type: string; text: string }[] = [];
  for (const d of discovered.slice(0, 12)) {
    const html = await fetchPage(d.url);
    if (!html) continue;
    const text = htmlToText(html);
    if (text.length < 40) continue;
    pages.push({ ...d, text });
  }
  console.log(`\nFetched ${pages.length} pages.`);
  for (const p of pages) {
    // The root URL is homepage by definition — never reclassified by nav text.
    if (p.type === "homepage") continue;
    const contentCat = classifyPageByContent(p.text, p.title);
    if (contentCat) {
      p.type = contentCat.category;
      const disc = discovered.find((d) => d.url === p.url);
      if (disc) disc.type = contentCat.category;
    }
  }
  console.log("Classified (URL+title+content):");
  for (const p of pages) console.log(`  [${p.type}] ${p.url}`);

  const evidence: any[] = [];
  const ctxFor = (p: { url: string; title: string; type: string }) => ({
    url: p.url, title: p.title || p.url, sourceType: `official_${p.type}`,
  });
  const pageTypeIs = (p: { type: string }, allowed: string[]) => allowed.includes(p.type);
  const pageNotes: { url: string; category: string; title: string; textLength: number; extracted: number; reason?: string }[] = [];

  for (const p of pages) {
    const ctx = ctxFor(p);
    const before = evidence.length;
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
    if (pageTypeIs(p, ["requirements", "admissions", "international"])) {
      const ielts = extractNumberReq(p.text, ctx, "min_ielts", "IELTS");
      if (ielts) evidence.push(ielts);
      const toefl = extractNumberReq(p.text, ctx, "min_toefl", "TOEFL");
      if (toefl) evidence.push(toefl);
      const pte = extractNumberReq(p.text, ctx, "min_pte", "PTE");
      if (pte) evidence.push(pte);
    }
    if (pageTypeIs(p, ["deadline", "admissions"])) {
      const d = extractDeadline(p.text, ctx);
      if (d) evidence.push(d);
    }
    const extracted = evidence.length - before;
    if (extracted === 0) {
      pageNotes.push({
        url: p.url, category: p.type, title: (p.title || "").slice(0, 120),
        textLength: p.text.length, extracted: 0,
        reason: p.type === "other" ? "no useful source category — no extraction scope applies" : "no supported field matched the page content",
      });
    }
  }
  for (const p of pages) {
    const count = evidence.filter((e) => e.sourceUrl === p.url).length;
    if (count > 0) pageNotes.push({ url: p.url, category: p.type, title: (p.title || "").slice(0, 120), textLength: p.text.length, extracted: count });
  }

  console.log("\n=== EXTRACTION ===");
  for (const ev of evidence) {
    console.log(`  ${ev.field}: ${JSON.stringify(ev.value)}${ev.currency ? ` ${ev.currency}` : ""} (${ev.period ?? ""}) ← ${ev.sourceUrl}`);
  }
  check("tuition 45500 GBP extracted", toNumber(best(evidence, "annual_tuition")?.value), 45500);
  check("tuition currency GBP", best(evidence, "annual_tuition")?.currency, "GBP");
  check("living 14200 GBP (annual)", toNumber(best(evidence, "annual_living_est")?.value), 14200);
  check("accommodation 11800 GBP (range line skipped)", toNumber(best(evidence, "accommodation_cost")?.value), 11800);
  check("IELTS 7.0 extracted", toNumber(best(evidence, "min_ielts")?.value), 7.0);
  check("TOEFL 100 extracted", toNumber(best(evidence, "min_toefl")?.value), 100);
  check("PTE 65 extracted", toNumber(best(evidence, "min_pte")?.value), 65);
  check("deadline 2026-10-15 extracted", best(evidence, "deadline")?.value, "2026-10-15");

  // ---- University decisions ----
  console.log("\n=== UNIVERSITY DECISIONS ===");
  const uniExtract = {
    annualTuition: toNumber(best(evidence, "annual_tuition")?.value) ?? undefined,
    tuitionCurrency: normalizeCurrency(best(evidence, "annual_tuition")?.currency) ?? undefined,
    annualLivingEst: toNumber(best(evidence, "annual_living_est")?.value) ?? undefined,
    livingCostCurrency: normalizeCurrency(best(evidence, "annual_living_est")?.currency) ?? undefined,
    accommodationCost: toNumber(best(evidence, "accommodation_cost")?.value) ?? undefined,
    accommodationCostCurrency: normalizeCurrency(best(evidence, "accommodation_cost")?.currency) ?? undefined,
  } as any;
  const decisions = decideUniversityFields(uniExtract, evidence, CURRENT as any);
  for (const d of decisions) {
    console.log(`  ${d.field}: DB=${String(d.dbValue ?? "NULL")} → new=${String(d.newValue ?? "NULL")} ${d.currency ?? ""} | ${d.action.toUpperCase()} | ${d.sourceUrl}`);
  }
  check("annual_tuition SKIPPED (unchanged)", decisions.find((d) => d.field === "annual_tuition")?.action, "skip");
  check("annual_living_est WRITE (DB NULL)", decisions.find((d) => d.field === "annual_living_est")?.action, "write");
  check("accommodation_cost WRITE (DB NULL)", decisions.find((d) => d.field === "accommodation_cost")?.action, "write");

  // ---- Program decisions ----
  console.log("\n=== PROGRAM DECISIONS ===");
  const insertedPrograms: string[] = [];
  const programSkips: any[] = [];
  for (const p of pages.filter((x) => x.type === "program").slice(0, 12)) {
    const v = validateProgramPage(p.url, p.title, p.text);
    if (!v.ok || !v.name) {
      console.log(`  discovery-only (${v.reason}): ${p.url}`);
      continue;
    }
    const existing = findExistingProgram(CURRENT.programs, v.name, p.url);
    if (existing) {
      programSkips.push({ name: v.name, old: existing.name, new: v.name, url: p.url });
      console.log(`  ${v.name}: EXISTS → SKIPPED — unchanged (${p.url})`);
    } else {
      insertedPrograms.push(v.name);
      console.log(`  ${v.name}: NEW → would insert`);
    }
  }
  check("no generic hub programs inserted", insertedPrograms, []);
  check("Computing BEng deduped → SKIPPED", programSkips.some((s) => s.name === "Computing BEng" && s.old === "Computing BEng" && s.new === "Computing BEng"), true);

  // ---- Cycle / requirements / scholarship decisions (dry-run vs DB) ----
  console.log("\n=== CYCLE / REQUIREMENTS / SCHOLARSHIP DECISIONS ===");
  const skipped: any[] = [];
  const deadlineEv = best(evidence, "deadline");
  const existingCycle = CURRENT.cycles.find((c) => (c.deadline instanceof Date ? c.deadline.toISOString().slice(0, 10) : String(c.deadline).slice(0, 10)) === String(deadlineEv?.value).slice(0, 10));
  if (existingCycle) {
    skipped.push({ entity: "application_cycle", field: "deadline", old: existingCycle.deadline, new: deadlineEv.value, url: deadlineEv.sourceUrl });
    console.log(`  application_cycle.deadline: ${String(existingCycle.deadline).slice(0, 10)} in DB → SKIPPED (unchanged) ← ${deadlineEv.sourceUrl}`);
  }

  const prog = CURRENT.programs[0];
  const ieltsEv = best(evidence, "min_ielts");
  if (prog.minIelts != null && String(prog.minIelts) === String(ieltsEv?.value)) {
    skipped.push({ entity: "program.requirements", field: "min_ielts", old: prog.minIelts, new: ieltsEv.value, url: ieltsEv.sourceUrl });
    console.log(`  program.requirements.min_ielts: ${prog.minIelts} in DB → SKIPPED (unchanged) ← ${ieltsEv.sourceUrl}`);
  }

  const schPage = pages.find((p) => p.type === "scholarship");
  const schTitle = (schPage ? firstHeading(schPage.text) || schPage.title : "").split("|")[0].trim();
  const existingSch = CURRENT.scholarships.find((x) => normalizeNameKey(x.title) === normalizeNameKey(schTitle));
  if (existingSch) {
    skipped.push({ entity: "scholarship", field: "title", old: existingSch.title, new: schTitle, url: schPage!.url });
    console.log(`  scholarship.title: '${existingSch.title}' in DB → SKIPPED (unchanged) ← ${schPage!.url}`);
  }

  check("application cycle SKIPPED", skipped.some((s) => s.entity === "application_cycle" && s.field === "deadline"), true);
  check("requirements min_ielts SKIPPED", skipped.some((s) => s.entity === "program.requirements" && s.field === "min_ielts" && s.old === 7.0), true);
  check("scholarship Imperial Inspires SKIPPED", skipped.some((s) => s.entity === "scholarship" && String(s.old).includes("Imperial Inspires")), true);

  // ---- Source persistence gating ----
  console.log("\n=== SOURCE PERSISTENCE ===");
  const PERSISTABLE = new Set(["homepage", "admissions", "international", "program", "tuition", "living_costs", "deadline", "requirements", "scholarship"]);
  const pageTextByUrl = new Map(pages.map((p) => [p.url, p.text]));
  const newSources: { url: string; title: string }[] = [];
  const discoveryOnly: { url: string; title: string; type: string; reason: string }[] = [];
  const added = new Set<string>();
  for (const ev of evidence) {
    if ((ev.sourceType || "").toLowerCase().includes("other")) continue;
    if (added.has(ev.sourceUrl)) continue;
    added.add(ev.sourceUrl);
    newSources.push({ url: ev.sourceUrl, title: ev.sourceTitle });
  }
  for (const d of discovered) {
    if (added.has(d.url)) continue;
    if (!PERSISTABLE.has(d.type)) {
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
  console.log(`  Persisted (${newSources.length}):`);
  for (const s of newSources) console.log(`    - ${s.url}`);
  console.log(`  Discovery-only (${discoveryOnly.length}):`);
  for (const s of discoveryOnly) console.log(`    - ${s.url} (${s.reason})`);

  check("research-and-innovation NOT persisted", newSources.some((s) => s.url.includes("research-and-innovation")), false);
  check("accessibility NOT persisted", newSources.some((s) => s.url.includes("accessibility")), false);
  check("faculties NOT persisted", newSources.some((s) => s.url.includes("faculties-and-departments")), false);
  check("generic /study/ NOT persisted", newSources.some((s) => s.url === "https://imperial.ac.uk/study/"), false);
  check("program page persisted", newSources.some((s) => s.url.includes("computing-beng")), true);
  check("tuition page persisted", newSources.some((s) => s.url.includes("fees-and-funding")), true);
  check("requirements page persisted", newSources.some((s) => s.url.includes("entry-requirements")), true);
  check("apply/deadline page persisted", newSources.some((s) => s.url === "https://imperial.ac.uk/study/apply/"), true);
  check("scholarship page persisted", newSources.some((s) => s.url.includes("scholarships")), true);
  check("ZERO assets persisted", newSources.some((s) => !isResearchSourceUrl(s.url)), false);
  check("rejected woff2", rejectedSources.some((r) => r.url.includes("woff2")), true);

  // ---- Debug notes ----
  console.log("\n=== PAGE NOTES (fetched but nothing extracted) ===");
  for (const n of pageNotes.filter((n) => n.extracted === 0)) console.log(`  [${n.category}] ${n.url} — ${n.reason}`);
  check("pageNotes include fetched-but-empty pages", pageNotes.filter((n) => n.extracted === 0).length > 0, true);

  console.log(`\n${failures === 0 ? "ALL SIMULATION TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
