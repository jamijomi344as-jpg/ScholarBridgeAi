/**
 * Orchestrator for a single university (spec §3, §18, §20, §21, §23).
 */
import { AGENT_CONFIG } from "./config";
import { fetchPageText, fetchHomepage, extractLinks, htmlToText, sleep } from "./fetch";
import { resolveOfficialDomain, pickOfficialDomainFromSearch } from "./domain";
import {
  classifyLink,
  extractMoney,
  extractNumberReq,
  extractRequiredFlag,
  extractFoundedYear,
  extractAcceptanceRate,
  extractIntlStudents,
  extractDeadline,
} from "./extract";
import { createSearchProvider } from "./providers";
import { aiExtract } from "./prompts";
import {
  readCurrent,
  upsertSource,
  writeUniversity,
  upsertProgram,
  upsertRequirements,
  upsertCycle,
  upsertScholarship,
} from "./persist";
import { logRunStart, logRunFinish, buildReport } from "./audit";
import { normalizeNameKey, toNumber, normalizeCurrency } from "./normalize";
import type { RunRequest, RunStatus, AuditReport, SourceEvidence } from "./types";

export type ProgressFn = (message: string) => void;

export async function runUniversity(
  universityId: number,
  scopes: RunRequest["scopes"],
  dryRun: boolean,
  progress: ProgressFn,
  maxPages = AGENT_CONFIG.maxPagesDefault
): Promise<AuditReport> {
  const logId = await logRunStart(universityId, scopes);
  const errors: string[] = [];
  const updatedFields: string[] = [];
  const skippedFields: string[] = [];
  const reviewRequired: string[] = [];
  const insertedPrograms: string[] = [];
  const updatedRequirements: string[] = [];
  const insertedCycles: string[] = [];
  const insertedScholarships: string[] = [];
  const newSources: { url: string; title: string }[] = [];
  const evidence: SourceEvidence[] = [];
  let universityName = `#${universityId}`;
  let sourcesReadBack = 0;
  let duplicatesPrevented = 0;

  try {
    // STEP A — read current DB (spec §3A)
    progress("Reading current database state...");
    const current = await readCurrent(universityId);
    if (current.university) universityName = current.university.name || universityName;
    else progress("WARNING: university row not found — continuing with discovery only.");

    // STEP B — discover official domain (spec §3B).
    // Priority: officialWebsiteUrl → official_website_url → websiteUrl →
    // website_url → admissionsUrl → internationalAdmissionsUrl →
    // undergraduateAdmissionsUrl → applicationUrl (generic, never by name).
    // Only when the DB row has no usable URL is the search provider consulted.
    const fetchPage = async (url: string) => await fetchPageText(url);
    const resolved = resolveOfficialDomain(current.university);
    let domain: string | null = resolved?.domain ?? null;
    let officialUrl: string | null = resolved?.url ?? null;

    if (!domain && current.university?.name) {
      progress("No official URL in database — searching for the official domain...");
      const search = createSearchProvider(fetchPage, []);
      const results = await search.search(`${current.university.name} official website`);
      const found = pickOfficialDomainFromSearch(results, current.university.name);
      if (found) {
        domain = found.domain;
        officialUrl = found.url;
        reviewRequired.push("official_domain_from_search"); // human check before trust
      }
    }

    if (!domain || !officialUrl) {
      progress("No official domain found — cannot research authoritatively.");
      reviewRequired.push("official_domain_missing");
      const report = buildReport({
        universityId, universityName, dryRun, updatedFields, skippedFields, reviewRequired,
        insertedPrograms, updatedRequirements, insertedCycles, insertedScholarships,
        newSources, errors, sourcesReadBack, duplicatesPrevented,
      });
      await logRunFinish(logId, report);
      return report;
    }
    progress(`Official domain: ${domain}`);

    // Record the resolved official URL as evidence (persisted as a source in
    // non-dry runs; never overwrites DB values).
    if (scopes.includes("university") || scopes.includes("sources")) {
      evidence.push({
        field: "official_domain",
        value: officialUrl,
        sourceUrl: officialUrl,
        sourceTitle: "Official website",
        sourceType: "official_university",
        exactEvidence: "Resolved from database URL fields",
        confidence: 1,
      });
    }

    const provider = createSearchProvider(fetchPage, [domain]);

    // STEP C — discover official pages (spec §3C)
    const wanted = scopes.includes("programs")
      ? ["admissions", "international", "undergraduate", "tuition", "scholarship", "program", "apply", "requirements", "accommodation"]
      : ["admissions", "international", "undergraduate", "tuition", "scholarship", "apply", "requirements", "accommodation"];
    const discovered: { url: string; title: string; type: string }[] = [];
    const seen = new Set<string>();

    for (const kw of wanted) {
      progress(`Finding ${kw} page...`);
      const results = await provider.search(`site:${domain} | ${kw}`);
      for (const r of results) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        const type = classifyLink(r.url, r.title);
        discovered.push({ url: r.url, title: r.title || kw, type });
      }
      await sleep(AGENT_CONFIG.fetchDelayMs);
    }

    // Also scan homepage links (breadth-first, capped).
    progress("Scanning official homepage links...");
    const homeHtml = await fetchHomepage(domain);
    if (homeHtml) {
      for (const link of extractLinks(homeHtml, `https://${domain}/`).slice(0, maxPages * 3)) {
        if (seen.has(link) || discovered.length >= maxPages * 2) continue;
        seen.add(link);
        discovered.push({ url: link, title: link, type: classifyLink(link, "") });
      }
    }

    // STEP D — fetch pages (capped, deduped) (spec §3D, §21)
    const pages: { url: string; title: string; type: string; text: string }[] = [];
    const fetched = new Set<string>();
    for (const d of discovered.slice(0, maxPages)) {
      if (fetched.has(d.url)) continue;
      fetched.add(d.url);
      progress(`Fetching ${d.type} page...`);
      const html = await fetchPage(d.url);
      if (!html) continue;
      const text = htmlToText(html);
      if (text.length < 80) continue; // too short / PDF unparsed
      pages.push({ ...d, text });
      await sleep(AGENT_CONFIG.fetchDelayMs);
    }

    // STEP E — extract (generic regex + optional AI assist) (spec §3E, §9)
    progress("Extracting structured data...");
    const ctxFor = (p: { url: string; title: string; type: string }) => ({
      url: p.url,
      title: p.title || p.url,
      sourceType: `official_${p.type}`,
    });

    for (const p of pages) {
      const ctx = ctxFor(p);
      const ai = await aiExtract(p.text, p.url);

      if (scopes.includes("tuition")) {
        const t = extractMoney(p.text, ctx, "annual_tuition");
        if (t) evidence.push(t);
        if (ai?.tuition?.amount && ai.tuition.currency) {
          evidence.push({ field: "annual_tuition", value: ai.tuition.amount, currency: ai.tuition.currency, period: ai.tuition.period, sourceUrl: ctx.url, sourceTitle: ctx.title, sourceType: ctx.sourceType, exactEvidence: "AI extraction", confidence: 0.6 });
        }
      }
      if (scopes.includes("living_costs")) {
        const living = extractMoney(p.text, ctx, "annual_living_est");
        if (living) evidence.push({ ...living, field: "annual_living_est" });
        const acc = extractMoney(p.text, ctx, "accommodation_cost");
        if (acc) evidence.push({ ...acc, field: "accommodation_cost" });
      }
      if (scopes.includes("requirements")) {
        const ielts = extractNumberReq(p.text, ctx, "min_ielts", "IELTS");
        if (ielts) evidence.push(ielts);
        if (ai?.ielts != null) evidence.push({ field: "min_ielts", value: ai.ielts, sourceUrl: ctx.url, sourceTitle: ctx.title, sourceType: ctx.sourceType, exactEvidence: "AI extraction", confidence: 0.6 });
        const toefl = extractNumberReq(p.text, ctx, "min_toefl", "TOEFL");
        if (toefl) evidence.push(toefl);
        const det = extractNumberReq(p.text, ctx, "min_det", "Duolingo");
        if (det) evidence.push(det);
        const sat = extractNumberReq(p.text, ctx, "min_sat", "SAT");
        if (sat) evidence.push(sat);
        const act = extractNumberReq(p.text, ctx, "min_act", "ACT");
        if (act) evidence.push(act);
        const gpa = extractNumberReq(p.text, ctx, "min_gpa", "GPA");
        if (gpa) evidence.push(gpa);
        // SAT/ACT required without minimum (spec §10) — only from explicit text.
        const satReq = extractRequiredFlag(p.text, ctx, "sat_required_no_min", "SAT");
        if (satReq) evidence.push(satReq);
        const actReq = extractRequiredFlag(p.text, ctx, "act_required_no_min", "ACT");
        if (actReq) evidence.push(actReq);
      }
      if (scopes.includes("university")) {
        const f = extractFoundedYear(p.text, ctx);
        if (f) evidence.push(f);
        const ar = extractAcceptanceRate(p.text, ctx);
        if (ar) evidence.push(ar);
        const intl = extractIntlStudents(p.text, ctx);
        if (intl.count) evidence.push(intl.count);
        if (intl.pct) evidence.push(intl.pct);
        const fee = extractMoney(p.text, ctx, "application_fee", "application");
        if (fee && /fee|apply|application/i.test(fee.exactEvidence)) evidence.push({ ...fee, field: "application_fee" });
      }
      if (scopes.includes("application_cycles")) {
        const d = extractDeadline(p.text, ctx);
        if (d) evidence.push(d);
      }
      if (scopes.includes("sources")) {
        evidence.push({ field: "source_discovered", value: p.url, sourceUrl: ctx.url, sourceTitle: ctx.title, sourceType: ctx.sourceType, exactEvidence: "page discovered", confidence: 1 });
      }
    }

    // STEP — normalize + write (spec §5, §6, §7)
    progress("Validating & comparing with database...");

    // University fields
    if (scopes.includes("university") || scopes.includes("tuition") || scopes.includes("living_costs")) {
      const uniExtract = {
        foundedYear: toNumber(best(evidence, "founded_year")) ?? undefined,
        acceptanceRate: toNumber(best(evidence, "acceptance_rate")) ?? undefined,
        internationalStudentsCount: toNumber(best(evidence, "international_students_count")) ?? undefined,
        internationalStudentsPercentage: toNumber(best(evidence, "international_students_percentage")) ?? undefined,
        annualTuition: toNumber(best(evidence, "annual_tuition")) ?? undefined,
        tuitionCurrency: normalizeCurrency(best(evidence, "annual_tuition")?.currency) ?? undefined,
        annualLivingEst: toNumber(best(evidence, "annual_living_est")) ?? undefined,
        livingCostCurrency: normalizeCurrency(best(evidence, "annual_living_est")?.currency) ?? undefined,
        accommodationCost: toNumber(best(evidence, "accommodation_cost")) ?? undefined,
        accommodationCostCurrency: normalizeCurrency(best(evidence, "accommodation_cost")?.currency) ?? undefined,
        applicationFee: toNumber(best(evidence, "application_fee")) ?? undefined,
        applicationFeeCurrency: normalizeCurrency(best(evidence, "application_fee")?.currency) ?? undefined,
      };
      if (!dryRun) {
        const res = await writeUniversity(universityId, uniExtract, evidence, current);
        updatedFields.push(...res.updated);
        skippedFields.push(...res.skipped);
        reviewRequired.push(...res.review);
      } else {
        // Dry-run: report what WOULD be written (only strong evidence).
        for (const f of ["founded_year", "annual_tuition", "annual_living_est", "accommodation_cost", "application_fee", "acceptance_rate", "international_students_count", "international_students_percentage"]) {
          if (best(evidence, f)) updatedFields.push(f);
        }
      }
    }

    // Programs (spec §3E)
    if (scopes.includes("programs")) {
      progress("Processing programs...");
      const programPages = pages.filter((p) => p.type === "programs").slice(0, AGENT_CONFIG.maxPrograms);
      for (const p of programPages) {
        const name = p.title.replace(/\s*[-|]\s*.*$/, "").trim() || "Program";
        const t = best(evidence, "annual_tuition");
        const prog = {
          name: name.slice(0, 120),
          annualTuition: t ? toNumber(t.value) ?? undefined : undefined,
          tuitionCurrency: t?.currency,
        };
        if (!dryRun) {
          const res = await upsertProgram(universityId, prog, p.url);
          if (res.inserted) insertedPrograms.push(prog.name);
          else duplicatesPrevented += 1;
        } else {
          insertedPrograms.push(prog.name);
        }
      }
    }

    // Requirements per program (spec §9, §10)
    if (scopes.includes("requirements") && insertedPrograms.length > 0 && !dryRun) {
      progress("Writing requirements...");
      const progs = await readCurrent(universityId);
      for (const p of progs.programs.slice(0, AGENT_CONFIG.maxPrograms)) {
        const satReq = best(evidence, "sat_required_no_min");
        const actReq = best(evidence, "act_required_no_min");
        const req = {
          minIelts: toNumber(best(evidence, "min_ielts")?.value) ?? undefined,
          minToefl: toNumber(best(evidence, "min_toefl")?.value) ?? undefined,
          minDet: toNumber(best(evidence, "min_det")?.value) ?? undefined,
          minSat: toNumber(best(evidence, "min_sat")?.value) ?? undefined,
          minAct: toNumber(best(evidence, "min_act")?.value) ?? undefined,
          minGpa: toNumber(best(evidence, "min_gpa")?.value) ?? undefined,
          otherRequirements: satReq || actReq
            ? `${satReq ? "SAT required — no minimum published. " : ""}${actReq ? "ACT required — no minimum published." : ""}`.trim()
            : undefined,
        };
        const ok = await upsertRequirements(p.id, req, best(evidence, "min_ielts")?.sourceUrl || "", best(evidence, "min_ielts")?.sourceYear);
        if (ok) updatedRequirements.push(p.name);
      }
    }

    // Application cycles (spec §11)
    if (scopes.includes("application_cycles")) {
      progress("Processing application cycles...");
      const deadlineEv = best(evidence, "deadline");
      if (deadlineEv) {
        const cycle = {
          deadline: typeof deadlineEv.value === "string" ? deadlineEv.value : undefined,
          applicationType: /early/i.test(deadlineEv.exactEvidence) ? "Early Action" : /regular/i.test(deadlineEv.exactEvidence) ? "Regular Decision" : undefined,
          applicationFee: toNumber(best(evidence, "application_fee")?.value) ?? undefined,
          applicationFeeCurrency: normalizeCurrency(best(evidence, "application_fee")?.currency) ?? undefined,
        };
        if (!dryRun) {
          const res = await upsertCycle(universityId, cycle, deadlineEv.sourceUrl);
          if (res.inserted) insertedCycles.push(`${cycle.applicationType || "Application"} ${cycle.deadline}`);
          else duplicatesPrevented += 1;
        } else {
          insertedCycles.push(`${cycle.applicationType || "Application"} ${cycle.deadline}`);
        }
      }
    }

    // Scholarships (spec §12) — amount_usd ONLY for USD sources.
    if (scopes.includes("scholarships")) {
      progress("Processing scholarships...");
      const schPages = pages.filter((p) => p.type === "scholarships").slice(0, 6);
      for (const p of schPages) {
        const t = extractMoney(p.text, ctxFor(p), "scholarship_amount", "year");
        const sch = {
          title: (p.title || "University Scholarship").slice(0, 150),
          websiteUrl: p.url,
          amountUsd: t?.currency === "USD" ? toNumber(t.value) ?? undefined : undefined,
          currency: t?.currency,
          amountOriginal: t?.currency && t.currency !== "USD" ? toNumber(t.value) ?? undefined : undefined,
        };
        if (!dryRun) {
          const res = await upsertScholarship(sch, p.url);
          if (res.inserted) insertedScholarships.push(sch.title);
          else duplicatesPrevented += 1;
        } else if (t) {
          insertedScholarships.push(sch.title);
        }
      }
    }

    // Sources (spec §4, §5)
    if (scopes.includes("sources")) {
      progress("Persisting verified sources...");
      if (!dryRun) {
        for (const ev of evidence.filter((e) => e.field !== "source_discovered")) {
          const res = await upsertSource(ev, universityId);
          if (res.inserted) newSources.push({ url: ev.sourceUrl, title: ev.sourceTitle });
          if (res.duplicate) duplicatesPrevented += 1;
        }
        for (const d of discovered.slice(0, maxPages)) {
          const dc = ctxFor(d);
          await upsertSource(
            { field: "page_discovered", value: d.url, sourceUrl: dc.url, sourceTitle: dc.title, sourceType: dc.sourceType, exactEvidence: "discovered", confidence: 1 },
            universityId
          );
        }
      } else {
        for (const ev of evidence.slice(0, 8)) newSources.push({ url: ev.sourceUrl, title: ev.sourceTitle });
      }
    }

    // STEP — read back + audit (spec §15)
    progress("Re-reading database & auditing...");
    const after = await readCurrent(universityId);
    sourcesReadBack = after.sourceUrls.size;

    const report = buildReport({
      universityId, universityName, dryRun, updatedFields, skippedFields, reviewRequired,
      insertedPrograms, updatedRequirements, insertedCycles, insertedScholarships,
      newSources, errors, sourcesReadBack, duplicatesPrevented,
    });
    progress("Audit complete.");
    await logRunFinish(logId, report);
    return report;
  } catch (err: any) {
    errors.push(String(err?.message || err));
    progress(`Error: ${err?.message || err}`);
    const report = buildReport({
      universityId, universityName, dryRun, updatedFields, skippedFields, reviewRequired,
      insertedPrograms, updatedRequirements, insertedCycles, insertedScholarships,
      newSources, errors, sourcesReadBack, duplicatesPrevented,
    });
    await logRunFinish(logId, report, String(err?.message || err));
    return report;
  }
}

/** Highest-confidence evidence for a field. */
function best(evidence: SourceEvidence[], field: string): SourceEvidence | null {
  const m = evidence
    .filter((e) => e.field === field)
    .sort((a, b) => b.confidence - a.confidence);
  return m[0] ?? null;
}

/** Normalized program name key (dedupe). */
export function programKey(name: string): string {
  return normalizeNameKey(name);
}
