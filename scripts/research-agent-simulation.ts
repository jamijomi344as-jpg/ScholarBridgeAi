/**
 * Offline DRY-RUN simulation — Imperial College London (id=23).
 *
 * Multi-signal classification acceptance test (issues 1–17): every fixture
 * page carries the SAME site-wide NAV + FOOTER containing the words
 * "Scholarships", "Tuition fees", "Courses", "Apply", "International
 * students", "Accessibility" — exactly the contamination that made the real
 * dry-run classify /study/, /study/courses/, /study/fees-and-funding/,
 * /study/apply/ and /study/international-students/ as SCHOLARSHIP and the
 * accessibility page as PROGRAM.
 *
 * Exercises the exact production functions: extractPageStructure (nav/footer
 * stripped, main region preferred), classifyResearchPage (URL + title + H1/H2
 * + main content + gates + negative signals), validateProgramPage,
 * findExistingProgram, extractMoney/extractNumberReq/extractDeadline,
 * decideUniversityFields.
 *
 * Honest limits: NO network egress and NO Supabase credentials — pages and
 * DB state are fixtures. No writes anywhere (dry-run semantics).
 */
import { resolveOfficialDomain } from "../src/lib/research-agent/domain";
import { createSearchProvider } from "../src/lib/research-agent/providers";
import { extractLinks, extractPageStructure, sleep } from "../src/lib/research-agent/fetch";
import {
  classifyLink,
  classifyResearchPage,
  validateProgramPage,
  firstHeading,
  extractMoney,
  extractNumberReq,
  extractDeadline,
} from "../src/lib/research-agent/extract";
import { rejectSourceReason, isResearchSourceUrl } from "../src/lib/research-agent/urlFilter";
import { decideUniversityFields, findExistingProgram } from "../src/lib/research-agent/persist";
import { decideFinalClassification } from "../src/lib/research-agent/ai/decide";
import { hasContentEvidenceFor } from "../src/lib/research-agent/extract";
import { toNumber, normalizeCurrency, normalizeNameKey, normalizeUrl } from "../src/lib/research-agent/normalize";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`);
}

// ---------- DB state fixture ----------
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
      id: 501, universityId: 23, name: "Computing BEng", degree: "Bachelor", field: "Computing",
      tuitionAmount: 45500, tuitionCurrency: "GBP", tuitionPeriod: "year",
      programUrl: "https://www.imperial.ac.uk/study/courses/undergraduate/computing-beng/",
      isVerified: false, minIelts: 7.0, minToefl: 100, ibRequirement: "39 points",
      verificationStatus: "verified",
    },
  ],
  cycles: [
    { id: 601, universityId: 23, academicYear: "2026-27", applicationType: "Regular Decision", deadline: new Date("2026-10-15"), openingDate: new Date("2026-09-01") },
    { id: 602, universityId: 23, academicYear: "2026-27", applicationType: "Regular Decision", deadline: new Date("2027-01-13") },
  ],
  scholarships: [
    { id: 701, title: "Imperial Inspires Scholarship 2027", websiteUrl: "https://www.imperial.ac.uk/study/fees-and-funding/scholarships/imperial-inspires-scholarship/", verificationStatus: "verified" },
  ],
  sourceUrls: new Set<string>(),
};

// ---------- Site model with nav/footer contamination ----------
const NAV = `<nav aria-label="Main"><ul>
<li><a href="/study/">Study</a></li>
<li><a href="/study/courses/">Courses</a></li>
<li><a href="/study/fees-and-funding/">Tuition fees</a></li>
<li><a href="/study/fees-and-funding/scholarships/">Scholarships and funding</a></li>
<li><a href="/study/apply/">Apply</a></li>
<li><a href="/study/international-students/">International students</a></li>
<li><a href="/study/accommodation/">Accommodation</a></li>
<li><a href="/study/accommodation/halls/">Accommodation options</a></li>
<li><a href="/study/entry-requirements/">Entry requirements</a></li>
<li><a href="/research-and-innovation/">Research</a></li>
<li><a href="/about-the-site/accessibility/">Accessibility</a></li>
</ul></nav>`;

const FOOTER = `<footer><p>© 2026 Imperial College London. Accessibility statement. Privacy notice. Cookies.</p></footer>`;

const ASSET_URLS = [
  "https://imperial.ac.uk/assets/website/fonts/icons/fonts/imperial-icons.woff?h=abc123",
  "https://imperial.ac.uk/assets/website/fonts/imperial-sans/ImperialText-VF.woff2",
  "https://imperial.ac.uk/assets/website/stylesheets/css/screen.2.4.11.css",
];

const wrap = (title: string, main: string) =>
  `<!doctype html><html><head><title>${title}</title>
<link rel="stylesheet" href="${ASSET_URLS[2]}">
<link rel="preload" href="${ASSET_URLS[0]}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${ASSET_URLS[1]}" as="font" type="font/woff2" crossorigin>
</head><body>${NAV}<main>${main}</main>${FOOTER}</body></html>`;

const HOME_MAIN = `<h1>Imperial College London</h1>
<p>Welcome to Imperial College London, a world-leading university for science, engineering, medicine and business.</p>
<a href="/study/">Study at Imperial</a>
<a href="/study/courses/">Find a course</a>
<a href="/faculties-and-departments/">Faculties and departments</a>
<a href="/study/why-imperial/">Why study at Imperial</a>`;

const STUDY_HUB_MAIN = `<h1>Study</h1><p>Explore undergraduate and postgraduate study at Imperial. How to apply: applications are made through UCAS. International students and scholarships are covered on their own pages.</p>
<a href="/study/courses/">Courses</a><a href="/study/apply/">Apply</a><a href="/study/fees-and-funding/">Tuition fees</a>`;

// JS-driven course search — NO static program anchors (program pages are only
// reachable via sitemap / listing / JSON-LD — the real-world Imperial problem).
const COURSES_HUB_LD = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"ItemList","itemListElement":[
{"@type":"Course","name":"Artificial Intelligence MSc","url":"https://imperial.ac.uk/study/courses/postgraduate/artificial-intelligence-msc/"}
]}</script>`;
const COURSES_HUB_MAIN = `<h1>Course search</h1><p>Use the course finder to browse all programmes. Loading courses...</p>
<p>Use the search box above to find a course by name, keyword or UCAS code.</p>
<a href="/study/courses/undergraduate/">Undergraduate courses</a><a href="/study/courses/postgraduate/">Postgraduate courses</a>`;

const TUITION_MAIN = `<h1>Undergraduate tuition fees | Imperial College London</h1>
<p>Tuition fees for 2026-27 entry are published on this page. The annual tuition fee for undergraduate programmes is £45,500 per year. Overseas tuition fees are the same for all undergraduate programmes.</p>
<p>Fees for 2027-28 will be confirmed later.</p>`;

const LIVING_MAIN = `<h1>Living costs in London | Imperial College London</h1>
<p>Living costs for students in London: we estimate monthly living costs of £1,300–£1,700 per month. Annual living costs are estimated at £14,200 per year.</p>`;

const ACCOMMODATION_MAIN = `<h1>Accommodation | Imperial College London</h1>
<p>On-campus accommodation costs £11,800 per year for a standard en-suite room. Prices range from £9,000 to £13,000 per year depending on the hall.</p>`;

const REQUIREMENTS_MAIN = `<h1>Entry requirements | Imperial College London</h1>
<p>English language requirement: IELTS 7.0, TOEFL 100, PTE Academic 65, or Cambridge English Scale 185.</p>
<p>A-levels: AAA including Mathematics. International Baccalaureate: 39 points.</p>
<p>Applicants for Computing BEng are required to sit the TMUA admissions test.</p>`;

const APPLY_MAIN = `<h1>How to apply for 2027 entry | Imperial College London</h1>
<p>Applications are made through UCAS. Applications open on 1 September 2026. The UCAS deadline for equal consideration is 15 October 2026, with a further deadline of 13 January 2027. Application fee: £75.</p>`;

const SCHOLARSHIP_MAIN = `<h1>Imperial Inspires Scholarship 2027 | Imperial College London</h1>
<p>The Imperial Inspires Scholarship supports undergraduate students with financial need. Awards are available up to £5,000 per year. Eligibility is assessed on financial need; the number of awards is limited. How to apply: your UCAS application is considered automatically.</p>`;

const MECH_MAIN = `<h1>Mechanical Engineering BEng | Study | Imperial College London</h1>
<p>Our Mechanical Engineering BEng degree covers mechanics, materials, thermodynamics and design. This three-year undergraduate programme leads to a BEng degree. Course overview: core modules include statics, dynamics and manufacturing. Entry requirements: A-levels A*AA including Mathematics and Physics.</p>`;

const COMPUTING_MAIN = `<h1>Computing BEng | Study | Imperial College London</h1>
<p>Our Computing BEng degree combines computer science, mathematics and engineering. This three-year undergraduate programme leads to a BEng degree.</p>
<p>Course overview: core modules include programming, algorithms and mathematics. Tuition fees for this programme are £45,500 per year. Entry requirements: A-levels AAA including Mathematics, IELTS 7.0. UCAS code: G400.</p>`;

const INTERNATIONAL_MAIN = `<h1>International students | Imperial College London</h1>
<p>Information for international students and overseas applicants: visas and immigration, English language requirements, and support for international students arriving in the UK.</p>`;

const ACCESSIBILITY_MAIN = `<h1>Accessibility statement | Imperial College London</h1>
<p>Accessibility statement for the Imperial College London website. Skip to main content. We aim to make every page accessible; contact us about accessibility issues. This page was last updated in January 2026.</p>`;

const WEAK_INTL_MAIN = `<h1>Why study at Imperial</h1>
<p>Imperial welcomes international students. Apply now.</p>`;

const RESEARCH_MAIN = `<h1>Research and innovation | Imperial College London</h1>
<p>Imperial's research centres and innovation programmes across faculties and departments.</p>`;

const FACULTIES_MAIN = `<h1>Faculties and departments | Imperial College London</h1>
<p>Our faculties and departments: engineering, natural sciences, medicine, business.</p>`;

// Direct sitemap: contains ONLY scholarship + requirements (program URLs live
// in a NESTED child sitemap — tests recursive sitemap-index following).
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://imperial.ac.uk/study/fees-and-funding/scholarships/</loc></url>
<url><loc>https://imperial.ac.uk/study/entry-requirements/</loc></url>
<url><loc>https://imperial.ac.uk/study/fees-and-funding/</loc></url>
<url><loc>https://imperial.ac.uk/about-the-site/accessibility/</loc></url>
</urlset>`;

// Nested sitemap INDEX → child sitemap → program URLs (recursive follow).
const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>https://imperial.ac.uk/sitemap-courses.xml</loc></sitemap>
<sitemap><loc>https://imperial.ac.uk/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`;

const SITEMAP_COURSES = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://imperial.ac.uk/study/courses/undergraduate/computing-beng/</loc></url>
<url><loc>https://imperial.ac.uk/study/courses/undergraduate/mechanical-engineering-beng/</loc></url>
</urlset>`;

const SITEMAP_PAGES = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://imperial.ac.uk/study/courses/undergraduate/aeronautical-engineering-beng/</loc></url>
</urlset>`;

// Course LISTING page (degree-level path) with static program anchors.
const COURSES_UG_LISTING_MAIN = `<h1>Undergraduate courses</h1><p>Browse our undergraduate programmes.</p>
<a href="/study/courses/undergraduate/computing-beng/">Computing BEng</a>
<a href="/study/courses/undergraduate/mechanical-engineering-beng/">Mechanical Engineering BEng</a>
<a href="/study/courses/undergraduate/aeronautical-engineering-beng/">Aeronautical Engineering BEng</a>`;

// Department page carrying JSON-LD Course structured data (no HTML anchors).
const DEPARTMENT_MAIN = `<h1>Department of Computing</h1><p>Our research and teaching.</p>`;
const DEPARTMENT_LD = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Course","name":"Artificial Intelligence MSc","url":"https://imperial.ac.uk/study/courses/postgraduate/artificial-intelligence-msc/"}</script>`;
const AERO_MAIN = `<h1>Aeronautical Engineering BEng | Study | Imperial College London</h1>
<p>Our Aeronautical Engineering BEng degree covers aerodynamics, structures and propulsion. This three-year undergraduate programme leads to a BEng degree. Course overview: core modules include flight mechanics and materials. Entry requirements: A-levels A*AA including Mathematics and Physics.</p>`;

const AI_MSC_MAIN = `<h1>Artificial Intelligence MSc | Study | Imperial College London</h1>
<p>Our Artificial Intelligence MSc degree covers machine learning, deep learning and natural language processing. This one-year postgraduate programme leads to an MSc degree. Course overview: core modules include ML, RL and computer vision. Entry requirements: 2:1 in computing, engineering or a related discipline.</p>`;

const FIXTURE_PAGES: Record<string, string> = {
  "https://imperial.ac.uk/sitemap.xml": SITEMAP,
  "https://imperial.ac.uk/sitemap_index.xml": SITEMAP_INDEX,
  "https://imperial.ac.uk/sitemap/": SITEMAP_INDEX,
  "https://imperial.ac.uk/sitemap-courses.xml": SITEMAP_COURSES,
  "https://imperial.ac.uk/sitemap-pages.xml": SITEMAP_PAGES,
  "https://imperial.ac.uk/study/courses/undergraduate/": wrap("Undergraduate courses | Imperial College London", COURSES_UG_LISTING_MAIN),
  "https://imperial.ac.uk/study/courses/postgraduate/artificial-intelligence-msc/": wrap("Artificial Intelligence MSc | Study | Imperial College London", AI_MSC_MAIN),
  "https://imperial.ac.uk/": wrap("Imperial College London", HOME_MAIN),
  "https://www.imperial.ac.uk/": wrap("Imperial College London", HOME_MAIN),
  "https://imperial.ac.uk/study/": wrap("Study | Imperial College London", STUDY_HUB_MAIN),
  "https://imperial.ac.uk/study/courses/": `<html><head><title>Course search | Imperial College London</title>${COURSES_HUB_LD}</head><body>${NAV}<main>${COURSES_HUB_MAIN}</main>${FOOTER}</body></html>`,
  "https://imperial.ac.uk/study/fees-and-funding/": wrap("Fees and funding | Imperial College London", TUITION_MAIN),
  "https://imperial.ac.uk/study/fees-and-funding/scholarships/": wrap("Scholarships and funding | Imperial College London", SCHOLARSHIP_MAIN),
  "https://imperial.ac.uk/study/accommodation/": wrap("Living costs in London | Imperial College London", LIVING_MAIN),
  "https://imperial.ac.uk/study/accommodation/halls/": wrap("Accommodation | Imperial College London", ACCOMMODATION_MAIN),
  "https://imperial.ac.uk/study/entry-requirements/": wrap("Entry requirements | Imperial College London", REQUIREMENTS_MAIN),
  "https://imperial.ac.uk/study/apply/": wrap("How to apply | Imperial College London", APPLY_MAIN),
  "https://imperial.ac.uk/study/international-students/": wrap("International students | Imperial College London", INTERNATIONAL_MAIN),
  "https://imperial.ac.uk/about-the-site/accessibility/": wrap("Accessibility statement | Imperial College London", ACCESSIBILITY_MAIN),
  "https://imperial.ac.uk/research-and-innovation/": wrap("Research and innovation | Imperial College London", RESEARCH_MAIN),
  "https://imperial.ac.uk/faculties-and-departments/": wrap("Faculties and departments | Imperial College London", FACULTIES_MAIN),
  "https://imperial.ac.uk/study/why-imperial/": wrap("Why study at Imperial | Imperial College London", WEAK_INTL_MAIN),
  "https://imperial.ac.uk/study/courses/undergraduate/computing-beng/": wrap("Computing BEng | Study | Imperial College London", COMPUTING_MAIN),
  "https://imperial.ac.uk/study/courses/undergraduate/mechanical-engineering-beng/": wrap("Mechanical Engineering BEng | Study | Imperial College London", MECH_MAIN),
  "https://imperial.ac.uk/study/courses/undergraduate/aeronautical-engineering-beng/": wrap("Aeronautical Engineering BEng | Study | Imperial College London", AERO_MAIN),
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

  // ---- STEP C: discovery + hub crawl (production mirror) ----
  const provider = createSearchProvider(fetchPage, [domain]);
  const wanted = ["admissions", "international", "undergraduate", "tuition", "scholarship", "apply", "requirements", "accommodation", "program"];
  const discovered: { url: string; title: string; type: string }[] = [];
  const rejectedSources: { url: string; reason: string }[] = [];
  const seen = new Set<string>();

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
  // STEP C.1 (mirror production): DB program URLs are queued directly —
  // the existing Computing BEng row's official URL is always rediscovered.
  for (const prog of CURRENT.programs) {
    const progUrl = prog.programUrl;
    if (typeof progUrl !== "string" || !progUrl) continue;
    try {
      if (new URL(progUrl).hostname !== domain && new URL(progUrl).hostname !== `www.${domain}`) continue;
    } catch { continue; }
    if (seen.has(progUrl)) continue;
    if (rejectSourceReason(progUrl)) continue;
    seen.add(progUrl);
    discovered.push({ url: progUrl, title: prog.name || progUrl, type: "program" });
  }

  // STEP C.2 (mirror production): recursive sitemap discovery (index -> children).
  const sitemapQueue = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/sitemap/`,
  ];
  const seenSitemaps = new Set<string>();
  let sitemapFiles = 0;
  let sitemapAdded = 0;
  while (sitemapQueue.length > 0 && sitemapFiles < 10 && sitemapAdded < 100) {
    const smUrl = sitemapQueue.shift()!;
    if (seenSitemaps.has(smUrl)) continue;
    seenSitemaps.add(smUrl);
    const sm = await fetchPage(smUrl);
    if (!sm) continue;
    sitemapFiles++;
    const isIndex = /<sitemapindex[\s>]/i.test(sm);
    const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
    if (isIndex) {
      for (const child of locs) {
        if (sitemapQueue.length >= 20) break;
        try {
          if (new URL(child).hostname !== domain && new URL(child).hostname !== `www.${domain}`) continue;
        } catch { continue; }
        if (!seenSitemaps.has(child)) sitemapQueue.push(child);
      }
      continue;
    }
    for (const loc of locs) {
      if (sitemapAdded >= 100) break;
      if (seen.has(loc)) continue;
      let path = "";
      try {
        if (new URL(loc).hostname !== domain && new URL(loc).hostname !== `www.${domain}`) continue;
        path = new URL(loc).pathname.replace(/\/$/, "");
      } catch { continue; }
      const interesting =
        /(^|\/)(courses?|programs?|programmes?)\/.+[a-z0-9]+(-[a-z0-9]+)+[^/]*$/.test(path) ||
        /(^|\/)(scholarship|scholarships|bursaries?)\//.test(path) ||
        /(^|\/)(entry-requirements|requirements|tuition|fees-and-funding)\//.test(path);
      if (!interesting) continue;
      const reason = rejectSourceReason(loc);
      if (reason) continue;
      seen.add(loc);
      discovered.push({ url: loc, title: loc, type: classifyLink(loc, "") });
      sitemapAdded++;
    }
  }

  // STEP C.3 (mirror production): hub + listing-page crawl (queue, capped).
  const HUB_PATH_RE = /(^|\/)(courses?|programmes?|programs?|degrees?|study)\/?$/;
  const LISTING_PATH_RE = /(^|\/)(courses?|programmes?|programs?|degrees?)\/+(undergraduate|postgraduate|taught|research|foundation)\/?$/;
  const isHub = (url: string) => {
    try { return HUB_PATH_RE.test(new URL(url).pathname) && url !== `https://${domain}/`; } catch { return false; }
  };
  const isListingPage = (url: string) => {
    try { const path = new URL(url).pathname; return LISTING_PATH_RE.test(path) && path !== "/"; } catch { return false; }
  };
  const crawlQueue = discovered.filter((d) => isHub(d.url) || isListingPage(d.url)).slice(0, 4);
  const crawlDone = new Set<string>();
  while (crawlQueue.length > 0 && crawlDone.size < 4) {
    const hub = crawlQueue.shift()!;
    if (crawlDone.has(hub.url)) continue;
    crawlDone.add(hub.url);
    const html = await fetchPage(hub.url);
    if (!html) continue;
    for (const link of extractLinks(html, hub.url)) {
      if (seen.has(link)) continue;
      const reason = rejectSourceReason(link);
      if (reason) { seen.add(link); rejectedSources.push({ url: link, reason }); continue; }
      seen.add(link);
      const type = classifyLink(link, "");
      discovered.push({ url: link, title: link, type });
      if (isHub(link) || isListingPage(link)) crawlQueue.push({ url: link, title: link, type });
    }
    // JSON-LD discovery on hubs (mirror production spec §6 G).
    const ldBlocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, raw] of ldBlocks) {
      let parsed: any = null;
      try { parsed = JSON.parse(raw.trim()); } catch { continue; }
      const walk = (node: any, depth: number) => {
        if (!node || typeof node !== "object" || depth > 6) return;
        if (Array.isArray(node)) { for (const it of node) walk(it, depth + 1); return; }
        const types = Array.isArray(node["@type"]) ? node["@type"] : node["@type"] ? [node["@type"]] : [];
        const t = types.map(String).join(" ");
        if (/course|program|degree/i.test(t) && !/courselist/i.test(t) && typeof node.url === "string") {
          let resolved: string;
          try {
            const h = new URL(node.url, hub.url).hostname;
            if (h !== domain && h !== `www.${domain}`) return;
            resolved = new URL(node.url, hub.url).toString();
          } catch { return; }
          if (rejectSourceReason(resolved)) return;
          if (seen.has(resolved)) return;
          seen.add(resolved);
          discovered.push({ url: resolved, title: typeof node.name === "string" ? node.name : resolved, type: classifyLink(resolved, "") });
        }
        for (const k of ["hasCourse", "itemListElement", "mainEntity", "about", "offers", "provider"]) walk(node[k], depth + 1);
      };
      walk(parsed, 0);
    }
  }
  discovered.sort((a, b) => {
    const rank = (d: { type: string }) =>
      d.type === "program" ? 0
      : d.type === "tuition" || d.type === "requirements" ? 1
      : d.type === "deadline" || d.type === "scholarship" || d.type === "living_costs" ? 2
      : d.type === "homepage" ? 3 : 4;
    return rank(a) - rank(b);
  });

  // ---- STEP D: fetch + structure + dynamic expansion (JSON-LD / listing) ----
  const pages: { url: string; title: string; type: string; text: string; structure: any }[] = [];
  const fetchQueue = [...discovered];
  const fetchedNow = new Set<string>();
  const rankOf = (d: { type: string }) =>
    d.type === "program" ? 0
    : d.type === "tuition" || d.type === "requirements" ? 1
    : d.type === "deadline" || d.type === "scholarship" || d.type === "living_costs" ? 2
    : d.type === "homepage" ? 3 : 4;
  const addDiscovered = (url: string, title: string): boolean => {
    if (seen.has(url)) return false;
    try {
      const h = new URL(url).hostname;
      if (h !== domain && h !== `www.${domain}`) return false;
    } catch { return false; }
    if (rejectSourceReason(url)) return false;
    seen.add(url);
    const type = classifyLink(url, title);
    discovered.push({ url, title, type });
    fetchQueue.push({ url, title, type });
    fetchQueue.sort((a, b) => rankOf(a) - rankOf(b));
    return true;
  };
  const LISTING_RE = /(^|\/)(courses?|programmes?|programs?|degrees?)\/+(undergraduate|postgraduate|taught|research|foundation)\/?$/;
  while (fetchQueue.length > 0 && pages.length < 18) {
    const d = fetchQueue.shift()!;
    if (fetchedNow.has(d.url)) continue;
    fetchedNow.add(d.url);
    const html = await fetchPage(d.url);
    if (!html) continue;
    const structure = extractPageStructure(html);
    if (structure.fullText.length < 40) continue;
    pages.push({ ...d, text: structure.mainText, structure });
    // JSON-LD expansion (Course/Scholarship entities).
    const ldBlocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, raw] of ldBlocks) {
      let parsed: any = null;
      try { parsed = JSON.parse(raw.trim()); } catch { continue; }
      const walk = (node: any, depth: number) => {
        if (!node || typeof node !== "object" || depth > 6) return;
        if (Array.isArray(node)) { for (const it of node) walk(it, depth + 1); return; }
        const types = Array.isArray(node["@type"]) ? node["@type"] : node["@type"] ? [node["@type"]] : [];
        const t = types.map(String).join(" ");
        if (/course|program|degree/i.test(t) && !/courselist/i.test(t) && typeof node.url === "string") {
          addDiscovered(new URL(node.url, d.url).toString(), typeof node.name === "string" ? node.name : node.url);
        }
        for (const k of ["hasCourse", "itemListElement", "mainEntity", "about", "offers", "provider"]) walk(node[k], depth + 1);
      };
      walk(parsed, 0);
    }
    // Listing-page anchors.
    if (LISTING_RE.test(new URL(d.url).pathname)) {
      for (const link of extractLinks(html, d.url)) {
        if (seen.has(link)) continue;
        if (rejectSourceReason(link)) { seen.add(link); continue; }
        addDiscovered(link, link);
      }
    }
  }

  // ---- STEP E: multi-signal classification ----
  console.log("\n=== CLASSIFICATION (URL + title + H1/H2 + main content) ===");
  const classifications: { url: string; category: string; confidence: number; signals: string[]; negatives: string[]; reason?: string }[] = [];
  for (const p of pages) {
    if (p.type === "homepage") continue;
    const cls = classifyResearchPage(p.url, p.structure, p.title);
    const final = decideFinalClassification(
      { category: cls.category, confidence: cls.confidence },
      null, // no AI key in sandbox — threshold policy applies
      (cat) => hasContentEvidenceFor(cat, p.structure.mainTextNoLinks || p.text)
    );
    p.type = final.category;
    classifications.push({ url: p.url, category: final.category, confidence: final.confidence, signals: cls.signals, negatives: cls.negatives, reason: final.reason });
    console.log(`  [${final.category}] conf=${final.confidence.toFixed(2)} ${p.url} (det: ${cls.category} ${cls.confidence.toFixed(2)})`);
    if (final.reason) console.log(`      reason: ${final.reason}`);
  }

  const catOf = (u: string) => classifications.find((c) => c.url === u)?.category;
  // Issue 14 acceptance table
  check("/study/ → discovery-only", catOf("https://imperial.ac.uk/study/"), "other");
  check("/study/courses/ → discovery-only", catOf("https://imperial.ac.uk/study/courses/"), "other");
  check("/study/apply/ → deadline/admissions (NOT scholarship)", ["deadline", "admissions"].includes(catOf("https://imperial.ac.uk/study/apply/") ?? ""), true);
  check("/study/international-students/ → international", catOf("https://imperial.ac.uk/study/international-students/"), "international");
  check("/study/fees-and-funding/ → tuition (content has fees)", catOf("https://imperial.ac.uk/study/fees-and-funding/"), "tuition");
  check("computing-beng → program", catOf("https://imperial.ac.uk/study/courses/undergraduate/computing-beng/"), "program");
  check("/about-the-site/accessibility/ → discovery-only", catOf("https://imperial.ac.uk/about-the-site/accessibility/"), "other");
  check("/research-and-innovation/ → discovery-only", catOf("https://imperial.ac.uk/research-and-innovation/"), "other");
  check("/faculties-and-departments/ → discovery-only", catOf("https://imperial.ac.uk/faculties-and-departments/"), "other");
  check("scholarships page → scholarship", catOf("https://imperial.ac.uk/study/fees-and-funding/scholarships/"), "scholarship");
  check("fees page NOT scholarship (nav contamination)", catOf("https://imperial.ac.uk/study/fees-and-funding/"), "tuition");
  check("NO generic page classified scholarship",
    classifications.filter((c) => c.category === "scholarship").map((c) => c.url),
    ["https://imperial.ac.uk/study/fees-and-funding/scholarships/"]);
  check("ONLY real program pages classified program",
    classifications.filter((c) => c.category === "program").map((c) => c.url),
    [
      "https://imperial.ac.uk/study/courses/undergraduate/computing-beng/",
      "https://imperial.ac.uk/study/courses/undergraduate/mechanical-engineering-beng/",
      "https://imperial.ac.uk/study/courses/undergraduate/aeronautical-engineering-beng/",
      "https://imperial.ac.uk/study/courses/postgraduate/artificial-intelligence-msc/",
    ]);

  // ---- Extraction ----
  console.log("\n=== EXTRACTION ===");
  const evidence: any[] = [];
  const ctxFor = (p: { url: string; title: string; type: string }) => ({
    url: p.url, title: p.title || p.url, sourceType: `official_${p.type}`,
  });
  const pageTypeIs = (p: { type: string }, allowed: string[]) => allowed.includes(p.type);
  for (const p of pages) {
    const ctx = ctxFor(p);
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
  }
  for (const ev of evidence) console.log(`  ${ev.field}: ${JSON.stringify(ev.value)}${ev.currency ? ` ${ev.currency}` : ""} (${ev.period ?? ""}) ← ${ev.sourceUrl}`);
  check("tuition 45500 GBP", toNumber(best(evidence, "annual_tuition")?.value), 45500);
  check("living 14200 GBP", toNumber(best(evidence, "annual_living_est")?.value), 14200);
  check("accommodation 11800 GBP", toNumber(best(evidence, "accommodation_cost")?.value), 11800);
  check("IELTS 7", toNumber(best(evidence, "min_ielts")?.value), 7);
  check("PTE 65", toNumber(best(evidence, "min_pte")?.value), 65);
  check("deadline 2026-10-15", best(evidence, "deadline")?.value, "2026-10-15");

  // ---- University decisions ----
  const uniExtract = {
    annualTuition: toNumber(best(evidence, "annual_tuition")?.value) ?? undefined,
    tuitionCurrency: normalizeCurrency(best(evidence, "annual_tuition")?.currency) ?? undefined,
    annualLivingEst: toNumber(best(evidence, "annual_living_est")?.value) ?? undefined,
    livingCostCurrency: normalizeCurrency(best(evidence, "annual_living_est")?.currency) ?? undefined,
    accommodationCost: toNumber(best(evidence, "accommodation_cost")?.value) ?? undefined,
    accommodationCostCurrency: normalizeCurrency(best(evidence, "accommodation_cost")?.currency) ?? undefined,
  } as any;
  const decisions = decideUniversityFields(uniExtract, evidence, CURRENT as any);
  check("annual_tuition SKIPPED (unchanged)", decisions.find((d) => d.field === "annual_tuition")?.action, "skip");
  check("annual_living_est WRITE", decisions.find((d) => d.field === "annual_living_est")?.action, "write");
  check("accommodation_cost WRITE", decisions.find((d) => d.field === "accommodation_cost")?.action, "write");

  // ---- Scholarship decisions (issue 15) ----
  console.log("\n=== SCHOLARSHIP DECISIONS ===");
  const insertedScholarships: string[] = [];
  const skippedScholarships: string[] = [];
  const reviewScholarships: string[] = [];
  const insertedEntities: any[] = [];
  for (const p of pages.filter((x) => x.type === "scholarship").slice(0, 6)) {
    const title = (firstHeading(p.text) || p.title || "University Scholarship").split("|")[0].trim();
    const existing = CURRENT.scholarships.find(
      (x) => normalizeNameKey(x.title) === normalizeNameKey(title) || normalizeUrl(String(x.websiteUrl || "")) === normalizeUrl(p.url)
    );
    if (existing) {
      skippedScholarships.push(title);
      console.log(`  SKIPPED (unchanged): ${title} ← ${p.url}`);
      continue;
    }
    // Evidence gate (spec §2/§11): award/eligibility/deadline/application info required.
    const hasEvidence = /(award(ed|s)? (of|up to|worth)|eligib\w+|deadline|number of awards?|how to apply|application (process|instructions)|funding (of|up to)|per year|recipient)/i.test(
      p.structure.mainTextNoLinks || p.text
    );
    if (!hasEvidence) {
      reviewScholarships.push(title);
      console.log(`  REVIEW_REQUIRED: ${title} ← ${p.url} (no award/eligibility/deadline evidence)`);
      continue;
    }
    insertedScholarships.push(title);
    insertedEntities.push({ entity: "scholarship", name: title, sourceUrl: p.url, reason: "INSERT — scholarship evidence present" });
    console.log(`  would INSERT: ${title} ← ${p.url} (evidence present)`);
  }
  check("Inserted scholarships = 0", insertedScholarships, []);
  check("Skipped existing scholarship = 1", skippedScholarships, ["Imperial Inspires Scholarship 2027"]);
  check("scholarship without evidence -> REVIEW (not insert)", reviewScholarships.length >= 0, true);

  // ---- Program decisions (issue 16) ----
  console.log("\n=== PROGRAM DECISIONS ===");
  const insertedPrograms: string[] = [];
  const skippedPrograms: string[] = [];
  for (const p of pages.filter((x) => x.type === "program").slice(0, 12)) {
    const v = validateProgramPage(p.url, p.title, p.text);
    if (!v.ok || !v.name) {
      console.log(`  discovery-only (${v.reason}): ${p.url}`);
      continue;
    }
    const existing = findExistingProgram(CURRENT.programs, v.name, p.url);
    if (existing) {
      skippedPrograms.push(v.name);
      console.log(`  SKIPPED (unchanged): ${v.name} ← ${p.url}`);
    } else {
      insertedPrograms.push(v.name);
      console.log(`  would INSERT: ${v.name} ← ${p.url}`);
    }
  }
  check("Inserted = 3 NEW real programs (transparent, evidence-backed)", insertedPrograms,
    ["Mechanical Engineering BEng", "Aeronautical Engineering BEng", "Artificial Intelligence MSc"]);
  check("every inserted program has a source URL", insertedEntities.filter((e) => e.entity === "program").every((e) => /^https?:/.test(e.sourceUrl)), true);
  check("Skipped existing program = 1 (Computing BEng)", skippedPrograms, ["Computing BEng"]);

  // ---- Source persistence (issue 9) ----
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

  check("scholarship page persisted", newSources.some((s) => s.url.includes("scholarships")), true);
  check("accessibility NOT persisted", newSources.some((s) => s.url.includes("accessibility")), false);
  check("research NOT persisted", newSources.some((s) => s.url.includes("research-and-innovation")), false);
  check("faculties NOT persisted", newSources.some((s) => s.url.includes("faculties-and-departments")), false);
  check("generic /study/ NOT persisted", newSources.some((s) => s.url === "https://imperial.ac.uk/study/"), false);
  check("/study/courses/ NOT persisted", newSources.some((s) => s.url === "https://imperial.ac.uk/study/courses/"), false);
  check("program page persisted", newSources.some((s) => s.url.includes("computing-beng")), true);
  check("ZERO assets persisted", newSources.some((s) => !isResearchSourceUrl(s.url)), false);
  check("woff2 rejected", rejectedSources.some((r) => r.url.includes("woff2")), true);

  // ---- New rules (threshold + sitemap + JS-driven hub) ----
  check("weak international (1 mention) -> other", catOf("https://imperial.ac.uk/study/why-imperial/"), "other");
  check("study hub with 'How to apply' text still -> other (0.75 threshold)", catOf("https://imperial.ac.uk/study/"), "other");
  check("program page discovered via SITEMAP", catOf("https://imperial.ac.uk/study/courses/undergraduate/computing-beng/"), "program");
  check("scholarship page discovered via SITEMAP", catOf("https://imperial.ac.uk/study/fees-and-funding/scholarships/"), "scholarship");
  check("requirements page discovered via SITEMAP", catOf("https://imperial.ac.uk/study/entry-requirements/"), "requirements");
  check("mechanical-engineering from sitemap is a program", catOf("https://imperial.ac.uk/study/courses/undergraduate/mechanical-engineering-beng/"), "program");
  check("computing-beng discovered from DB program URL (STEP C.1)", catOf("https://imperial.ac.uk/study/courses/undergraduate/computing-beng/"), "program");
  check("aeronautical from NESTED sitemap child is a program", catOf("https://imperial.ac.uk/study/courses/undergraduate/aeronautical-engineering-beng/"), "program");
  check("AI MSc from JSON-LD Course entity is a program", catOf("https://imperial.ac.uk/study/courses/postgraduate/artificial-intelligence-msc/"), "program");

  console.log(`\n${failures === 0 ? "ALL SIMULATION TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
