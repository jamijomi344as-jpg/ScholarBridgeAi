/**
 * Offline tests for the research-agent OpenRouter integration (spec §24).
 *
 * OpenRouter is MOCKED via an injected fetchFn — no live API calls, no key.
 * Covers: program/scholarship classification, tuition/IELTS/TOEFL/DET/PTE/
 * Cambridge extraction, SAT/ACT required-vs-minimum (middle-50% guard),
 * dates, currency preservation, ranges, evidence validation, duplicate
 * caching, null-safety, AI-unavailable fallback, malformed JSON fallback,
 * rate-limit retry + backoff.
 */
import {
  OpenRouterAIProvider,
  NullAIProvider,
  createAIProvider,
  parseModelJson,
} from "../src/lib/research-agent/ai/openrouter";
import { decideFinalClassification } from "../src/lib/research-agent/ai/decide";
import { validateAIEvidence, aiEvidenceToSourceEvidence } from "../src/lib/research-agent/ai/validate";
import { canMarkVerified } from "../src/lib/research-agent/validate";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`);
}

/** Mock OpenRouter responder — returns canned content per scenario. */
function mockFetch(responder: (call: number, body: any) => { status?: number; content?: string }) {
  let calls = 0;
  const fn = async (url: string, init: any): Promise<Response> => {
    calls++;
    const body = JSON.parse(String(init.body));
    const r = responder(calls, body);
    if (r.status && r.status !== 200) {
      return new Response(JSON.stringify({ error: { message: "mock" } }), { status: r.status });
    }
    const content = r.content ?? "{}";
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  (fn as any).calls = () => calls;
  return fn;
}

const PAGE = {
  url: "https://imperial.ac.uk/study/courses/undergraduate/computing-beng/",
  title: "Computing BEng | Study | Imperial College London",
  h1: "Computing BEng | Study | Imperial College London",
  headings: "Course overview | Entry requirements",
  mainContent: "Our Computing BEng degree combines computer science, mathematics and engineering. Tuition fees are £45,500 per year. English language requirement: IELTS 7.0, TOEFL 100, PTE Academic 65, Cambridge English Scale 185.",
};

async function main() {
  // 1. Program classification via AI
  {
    const fetchFn = mockFetch(() => ({
      content: JSON.stringify({ pageType: "program", confidence: 0.97, reason: "course page with BEng degree", evidence: ["degree name", "duration", "entry requirements"] }),
    }));
    const p = new OpenRouterAIProvider({ apiKey: "test-key", model: "openrouter/free", fetchFn: fetchFn as any });
    const r = await p.classifyPage(PAGE);
    check("1. AI program classification", r?.pageType, "program");
    check("1. confidence", r?.confidence, 0.97);
  }

  // 2. Scholarship classification
  {
    const fetchFn = mockFetch(() => ({
      content: JSON.stringify({ pageType: "scholarship", confidence: 0.95, reason: "award page", evidence: ["award amount", "eligibility"] }),
    }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    const r = await p.classifyPage({ ...PAGE, url: "https://imperial.ac.uk/study/fees-and-funding/scholarships/" });
    check("2. AI scholarship classification", r?.pageType, "scholarship");
  }

  // 3. Tuition extraction (currency preserved, no conversion)
  {
    const fetchFn = mockFetch(() => ({
      content: JSON.stringify({
        evidence: [{ field: "annual_tuition", value: 45500, currency: "GBP", period: "year", sourceUrl: PAGE.url, sourceTitle: PAGE.title, evidenceQuote: "Tuition fees are £45,500 per year", confidence: 0.98 }],
        programs: [], requirements: [], applicationCycles: [], scholarships: [], universityFields: {},
      }),
    }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    const r = await p.extractPage(PAGE);
    const ev = r?.evidence?.[0];
    check("3. tuition value", ev?.value, 45500);
    check("3. currency preserved GBP (not converted)", ev?.currency, "GBP");
    check("3. period", ev?.period, "year");
  }

  // 4. IELTS/TOEFL/DET/PTE/Cambridge extraction
  {
    const fetchFn = mockFetch(() => ({
      content: JSON.stringify({
        requirements: [{
          minIelts: 7, minToefl: 100, minDet: 120, minPte: 65, minCambridge: 185,
          evidenceQuote: "IELTS 7.0, TOEFL 100, PTE Academic 65, Cambridge English Scale 185", confidence: 0.9,
        }],
        evidence: [], programs: [], applicationCycles: [], scholarships: [], universityFields: {},
      }),
    }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    const r = await p.extractPage(PAGE);
    const req = r?.requirements?.[0];
    check("4. IELTS", req?.minIelts, 7);
    check("4. TOEFL", req?.minToefl, 100);
    check("4. DET", req?.minDet, 120);
    check("4. PTE", req?.minPte, 65);
    check("4. Cambridge", req?.minCambridge, 185);
  }

  // 5. SAT/ACT middle-50% is NOT a minimum (rejected by validator)
  {
    const v = validateAIEvidence(
      { field: "min_sat", value: 1510, sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "SAT middle 50% 1510–1570", confidence: 0.9 },
      PAGE.url, PAGE.mainContent, "requirements"
    );
    check("5. middle-50% SAT rejected", v.ok, false);
    check("5. reason mentions middle-50", v.reasons.join(" ").toLowerCase().includes("middle-50"), true);
    const vOk = validateAIEvidence(
      { field: "min_sat", value: 1450, sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "minimum SAT 1450", confidence: 0.9 },
      PAGE.url, "minimum SAT 1450", "requirements"
    );
    check("5. explicit minimum SAT accepted", vOk.ok, true);
  }

  // 6. Date extraction (application cycle)
  {
    const fetchFn = mockFetch(() => ({
      content: JSON.stringify({
        applicationCycles: [{
          academicYear: "2026-27", applicationType: "Regular Decision",
          deadline: "2026-10-15", openingDate: "2026-09-01", applicationFee: 75, applicationFeeCurrency: "GBP",
          evidenceQuote: "The UCAS deadline for equal consideration is 15 October 2026", confidence: 0.93,
        }],
        evidence: [], programs: [], requirements: [], scholarships: [], universityFields: {},
      }),
    }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    const r = await p.extractPage({ ...PAGE, url: "https://imperial.ac.uk/study/apply/" });
    check("6. cycle deadline", r?.applicationCycles?.[0]?.deadline, "2026-10-15");
    check("6. fee currency", r?.applicationCycles?.[0]?.applicationFeeCurrency, "GBP");
  }

  // 7. Currency: CHF preserved
  {
    const fetchFn = mockFetch(() => ({
      content: JSON.stringify({
        evidence: [{ field: "annual_tuition", value: 1500, currency: "CHF", period: "year", sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "CHF 1,500 per year", confidence: 0.97 }],
        programs: [], requirements: [], applicationCycles: [], scholarships: [], universityFields: {},
      }),
    }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    const r = await p.extractPage(PAGE);
    check("7. CHF currency", r?.evidence?.[0]?.currency, "CHF");
  }

  // 8. Evidence validation: quote not in page text → rejected
  {
    const v = validateAIEvidence(
      { field: "annual_tuition", value: 99999, sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "Tuition is £99,999 per year", confidence: 0.99 },
      PAGE.url, PAGE.mainContent, "tuition"
    );
    check("8. quote not found → rejected", v.ok, false);
    const v2 = validateAIEvidence(
      { field: "annual_tuition", value: 45500, sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "Tuition fees are £45,500 per year", confidence: 0.98 },
      PAGE.url, PAGE.mainContent, "tuition"
    );
    check("8. valid quote + type → accepted", v2.ok, true);
    check("8. wrong page type → rejected", validateAIEvidence(
      { field: "annual_tuition", value: 45500, sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "Tuition fees are £45,500 per year", confidence: 0.98 },
      PAGE.url, PAGE.mainContent, "scholarship"
    ).ok, false);
  }

  // 9. Duplicate detection: cache by URL+contentHash → only one fetch
  {
    let calls = 0;
    const fetchFn = mockFetch((n) => {
      calls = n;
      return { content: JSON.stringify({ pageType: "program", confidence: 0.9, reason: "r", evidence: [] }) };
    });
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    await p.classifyPage(PAGE);
    await p.classifyPage(PAGE); // cached — no second network call
    check("9. cache prevents duplicate AI calls", calls, 1);
  }

  // 10. Null-safe behavior
  {
    const fetchFn = mockFetch(() => ({ content: JSON.stringify({ pageType: "discovery_only", confidence: 0.9, reason: "", evidence: [] }) }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    const r = await p.classifyPage({ url: "https://x.edu/", title: "", h1: "", headings: "", mainContent: "" });
    check("10. empty inputs still work", r?.pageType, "discovery_only");
  }

  // 11. AI unavailable → NullAIProvider fallback (no key)
  {
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const p = createAIProvider();
    check("11. unavailable without key", p.available, false);
    check("11. classify returns null", await p.classifyPage(PAGE), null);
    check("11. extract returns null", await p.extractPage(PAGE), null);
    if (saved !== undefined) process.env.OPENROUTER_API_KEY = saved;
  }

  // 12. Malformed JSON → null (fallback to regex path)
  {
    const fetchFn = mockFetch(() => ({ content: "Sorry, I cannot help with that. Here is prose without JSON." }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any });
    check("12. malformed JSON → null", await p.classifyPage(PAGE), null);
    check("12. parseModelJson garbage", parseModelJson("not json at all"), null);
    check("12. parseModelJson fenced", (parseModelJson<{a:number}>('```json\n{"a":1}\n```'))?.a, 1);
  }

  // 13. Rate limit retry with backoff (429 → 200)
  {
    let call = 0;
    const fetchFn = mockFetch((n) => {
      call = n;
      if (n === 1) return { status: 429 };
      return { content: JSON.stringify({ pageType: "tuition", confidence: 0.9, reason: "ok", evidence: [] }) };
    });
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any, retryDelaysMs: [10, 10] });
    const r = await p.classifyPage(PAGE);
    check("13. retried after 429", r?.pageType, "tuition");
    check("13. two attempts made", call, 2);
  }

  // 14. Persistent rate limit → null (never infinite retry)
  {
    const fetchFn = mockFetch(() => ({ status: 503 }));
    const p = new OpenRouterAIProvider({ apiKey: "k", fetchFn: fetchFn as any, retryDelaysMs: [5, 5] });
    check("14. persistent 503 → null", await p.classifyPage(PAGE), null);
  }

  // 15. AI evidence → SourceEvidence mapping is never auto-verified
  {
    const ev = aiEvidenceToSourceEvidence(
      { field: "annual_tuition", value: 45500, currency: "GBP", period: "year", sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "Tuition fees are £45,500 per year", confidence: 0.99 },
      PAGE.url, "tuition"
    );
    check("15. mapped field", ev.field, "annual_tuition");
    check("15. aiGenerated flag", ev.aiGenerated, true);
    check("15. NEVER verified by AI confidence alone", canMarkVerified(ev), false);
  }

  // 16. AI priority policy (user rule 6/9) — decideFinalClassification
  {
    const safety = (cat: string) => cat === "tuition" || cat === "program"; // mock gate
    // 16a. Weak deterministic (0.46) + AI unavailable → discovery_only (real bug: fees page)
    check("16a. det 0.46 international, no AI -> other",
      decideFinalClassification({ category: "international", confidence: 0.46 }, null, safety).category, "other");
    // 16b. Weak deterministic + AI says other 0.95 → other (rule 9)
    check("16b. AI other 0.95 overrides weak det international 0.46",
      decideFinalClassification({ category: "international", confidence: 0.46 }, { pageType: "other", confidence: 0.95 }, safety).category, "other");
    // 16c. Weak det + AI tuition 0.9 + safety passes → tuition
    const c16c = decideFinalClassification({ category: "international", confidence: 0.46 }, { pageType: "tuition", confidence: 0.9 }, safety);
    check("16c. AI tuition 0.9 accepted (safety ok)", c16c.category, "tuition");
    check("16c. aiUsed", c16c.aiUsed, true);
    // 16d. AI tuition 0.9 but safety fails → not trusted
    check("16d. AI tuition 0.9 safety fail -> other",
      decideFinalClassification({ category: "international", confidence: 0.46 }, { pageType: "tuition", confidence: 0.9 }, (c) => c === "program").category, "other");
    // 16e. AI 0.8 (0.75-0.849) + deterministic disagrees → not accepted
    check("16e. AI 0.8 no agreement -> other",
      decideFinalClassification({ category: "other", confidence: 0.4 }, { pageType: "scholarship", confidence: 0.8 }, safety).category, "other");
    // 16f. AI 0.8 + deterministic agrees → accepted
    const c16f = decideFinalClassification({ category: "tuition", confidence: 0.9 }, { pageType: "tuition", confidence: 0.8 }, safety);
    check("16f. AI 0.8 agrees with det -> tuition", c16f.category, "tuition");
    // 16g. AI 0.6 (< 0.75) → never accepted
    check("16g. AI 0.6 -> other (weak det)", decideFinalClassification({ category: "other", confidence: 0.3 }, { pageType: "program", confidence: 0.6 }, safety).category, "other");
    // 16h. AI 0.6 + STRONG deterministic → keep deterministic
    check("16h. AI 0.6 + det program 0.99 -> program",
      decideFinalClassification({ category: "program", confidence: 0.99 }, { pageType: "scholarship", confidence: 0.6 }, safety).category, "program");
    // 16i. strong deterministic + AI unavailable → stays (no threshold violation)
    check("16i. det program 0.99 no AI -> program",
      decideFinalClassification({ category: "program", confidence: 0.99 }, null, safety).category, "program");
    // 16j. deterministic 0.74 (just below) → discovery_only
    check("16j. det 0.74 -> other", decideFinalClassification({ category: "admissions", confidence: 0.74 }, null, safety).category, "other");
    // 16k. deterministic 0.75 exactly → accepted
    check("16k. det 0.75 -> kept", decideFinalClassification({ category: "admissions", confidence: 0.75 }, null, safety).category, "admissions");
  }

  // 17. Range values rejected as scalars (spec §10)
  {
    const v = validateAIEvidence(
      { field: "annual_living_est", value: 15000, rangeMin: 15000, rangeMax: 18000, currency: "GBP", sourceUrl: PAGE.url, sourceTitle: "x", evidenceQuote: "£15,000–£18,000 per year", confidence: 0.9 },
      PAGE.url, "Living costs £15,000–£18,000 per year", "living_costs"
    );
    check("17. range → rejected as scalar", v.ok, false);
  }

  console.log(`\n${failures === 0 ? "ALL AI TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
