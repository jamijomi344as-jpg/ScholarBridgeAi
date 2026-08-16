/**
 * Orchestrator for a single university (spec §3, §18, §20, §21, §23).
 */
import { AGENT_CONFIG } from "./config";
import { fetchPageText, fetchHomepage, extractLinks, htmlToText, sleep } from "./fetch";
import { resolveOfficialDomain, pickOfficialDomainFromSearch } from "./domain";
import {
  classifyLink,
  classifyPageByContent,
  isMeaningfulSourceTitle,
  firstHeading,
  validateProgramPage,
  extractMoney,
  extractNumberReq,
  extractTextReq,
  extractFlagReq,
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
  decideUniversityFields,
  upsertProgram,
  findExistingProgram,
  upsertRequirements,
  upsertCycle,
  upsertScholarship,
} from "./persist";
import { logRunStart, logRunFinish, buildReport } from "./audit";
import { normalizeNameKey, normalizeUrl, toNumber, normalizeCurrency, toIsoDate } from "./normalize";
import { isResearchSourceUrl, rejectSourceReason } from "./urlFilter";
import type { RunRequest, RunStatus, AuditReport, SourceEvidence, FieldDecision } from "./types";

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
  const updatedFields: FieldDecision[] = [];
  const skippedFields: (string | FieldDecision)[] = [];
  const reviewRequired: (string | FieldDecision)[] = [];
  const insertedPrograms: string[] = [];
  const updatedRequirements: string[] = [];
  const insertedCycles: string[] = [];
  const insertedScholarships: string[] = [];
  const newSources: { url: string; title: string }[] = [];
  const rejectedSources: { url: string; reason: string }[] = [];
  const discoveryOnly: { url: string; title: string; type: string; reason: string }[] = [];
  const evidence: SourceEvidence[] = [];
  const debug = {
    fetchedPages: 0,
    classifiedCounts: {} as Record<string, number>,
    extractionCounts: {} as Record<string, number>,
    pageNotes: [] as { url: string; category: string; title: string; textLength: number; extracted: number; reason?: string }[],
  };
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
        newSources, rejectedSources, discoveryOnly, debug, errors, sourcesReadBack, duplicatesPrevented,
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
        // Strict source filtering (spec §3D): fonts/css/js/images/tracking are
        // never research sources — rejected up front.
        const rejectReason = rejectSourceReason(r.url);
        if (rejectReason) {
          seen.add(r.url);
          rejectedSources.push({ url: r.url, reason: rejectReason });
          continue;
        }
        seen.add(r.url);
        const type = classifyLink(r.url, r.title);
        discovered.push({ url: r.url, title: r.title || kw, type });
      }
      await sleep(AGENT_CONFIG.fetchDelayMs);
    }

    // Also scan homepage links (breadth-first, capped) — HTML/PDF pages only.
    progress("Scanning official homepage links...");
    const home = await fetchHomepage(domain);
    if (home) {
      // The homepage itself is the most authoritative source — always kept
      // as an official_homepage research page (spec §3D).
      if (!seen.has(home.url)) {
        seen.add(home.url);
        discovered.unshift({
          url: home.url,
          title: `${universityName} official homepage`,
          type: "homepage",
        });
      }
      for (const link of extractLinks(home.html, home.url).slice(0, maxPages * 3)) {
        if (seen.has(link) || discovered.length >= maxPages * 2) continue;
        const rejectReason = rejectSourceReason(link);
        if (rejectReason) {
          seen.add(link);
          rejectedSources.push({ url: link, reason: rejectReason });
          continue;
        }
        seen.add(link);
        discovered.push({ url: link, title: link, type: classifyLink(link, "") });
      }
    }

    // Course hubs are crawled ONE level to discover real program pages
    // (hub pages themselves are discovery-only, never programs — spec §7).
    // Queue-based: hubs discovered while crawling hubs are crawled too
    // (e.g. /study/ → /study/courses/ → program pages).
    const HUB_PATH_RE = /(^|\/)(courses?|programmes?|programs?|degrees?|study)\/?$/;
    const isHub = (url: string) => {
      try {
        return HUB_PATH_RE.test(new URL(url).pathname) && url !== home?.url;
      } catch {
        return false;
      }
    };
    const hubQueue = discovered.filter((d) => isHub(d.url)).slice(0, AGENT_CONFIG.maxHubPages);
    const hubCrawled = new Set<string>();
    while (hubQueue.length > 0 && hubCrawled.size < AGENT_CONFIG.maxHubPages) {
      const hub = hubQueue.shift()!;
      if (hubCrawled.has(hub.url)) continue;
      hubCrawled.add(hub.url);
      progress(`Crawling course hub ${hub.url} for program links (discovery only)...`);
      const html = await fetchPage(hub.url);
      if (!html) continue;
      for (const link of extractLinks(html, hub.url)) {
        if (seen.has(link) || discovered.length >= maxPages * 4) continue;
        const reason = rejectSourceReason(link);
        if (reason) {
          seen.add(link);
          rejectedSources.push({ url: link, reason });
          continue;
        }
        seen.add(link);
        const type = classifyLink(link, "");
        discovered.push({ url: link, title: link, type });
        if (isHub(link) && hubCrawled.size < AGENT_CONFIG.maxHubPages) hubQueue.push({ url: link, title: link, type });
      }
      await sleep(AGENT_CONFIG.fetchDelayMs);
    }

    // Program-priority ordering: real program pages and tuition/requirements
    // pages are fetched FIRST so the page cap never starves them.
    discovered.sort((a, b) => {
      const rank = (d: { type: string }) =>
        d.type === "program" ? 0
        : d.type === "tuition" || d.type === "requirements" ? 1
        : d.type === "deadline" || d.type === "scholarship" || d.type === "living_costs" ? 2
        : d.type === "homepage" ? 3
        : 4;
      return rank(a) - rank(b);
    });

    // STEP D — fetch pages (capped, deduped) (spec §3D, §21)
    const pages: { url: string; title: string; type: string; text: string }[] = [];
    const fetched = new Set<string>();
    for (const d of discovered.slice(0, maxPages)) {
      if (fetched.has(d.url)) continue;
      // Defense in depth: never fetch assets that slipped past discovery.
      if (!isResearchSourceUrl(d.url)) continue;
      fetched.add(d.url);
      progress(`Fetching ${d.type} page...`);
      const html = await fetchPage(d.url);
      if (!html) continue;
      const text = htmlToText(html);
      if (text.length < 80) continue; // too short / PDF unparsed
      pages.push({ ...d, text });
      await sleep(AGENT_CONFIG.fetchDelayMs);
    }

    // STEP E — extract (generic regex + optional AI assist) (spec §3E, §9).
    // CLASSIFICATION FIRST: fetched pages are re-classified using URL +
    // title + CONTENT — URL keywords alone are not enough (spec §3D).
    // Page-type gate + per-field hints: a tuition page only contributes
    // tuition evidence, a living-costs page only living/accommodation
    // evidence, etc. — generic, never by university name.
    progress("Classifying fetched pages by content...");
    for (const p of pages) {
      // The root URL is homepage by definition — never reclassified by nav text.
      if (p.type === "homepage") continue;
      const contentCat = classifyPageByContent(p.text, p.title);
      if (contentCat) {
        const oldType = p.type;
        p.type = contentCat.category;
        const disc = discovered.find((d) => d.url === p.url);
        if (disc && disc.type === oldType) disc.type = contentCat.category;
      }
    }

    progress("Extracting structured data...");
    const ctxFor = (p: { url: string; title: string; type: string }) => ({
      url: p.url,
      title: p.title || p.url,
      sourceType: `official_${p.type}`,
    });
    const pageTypeIs = (p: { type: string }, allowed: string[]) => allowed.includes(p.type);

    debug.fetchedPages = pages.length;
    for (const p of pages) debug.classifiedCounts[p.type] = (debug.classifiedCounts[p.type] || 0) + 1;

    for (const p of pages) {
      const ctx = ctxFor(p);
      const ai = await aiExtract(p.text, p.url);
      const before = evidence.length;

      if (scopes.includes("tuition") && pageTypeIs(p, ["tuition"])) {
        const t = extractMoney(p.text, ctx, "annual_tuition", "year", /tuition|fee/);
        if (t) evidence.push(t);
        if (ai?.tuition?.amount && ai.tuition.currency) {
          evidence.push({ field: "annual_tuition", value: ai.tuition.amount, currency: ai.tuition.currency, period: ai.tuition.period, sourceUrl: ctx.url, sourceTitle: ctx.title, sourceType: ctx.sourceType, exactEvidence: "AI extraction", confidence: 0.6 });
        }
      }
      if (scopes.includes("living_costs") && pageTypeIs(p, ["living_costs"])) {
        const living = extractMoney(p.text, ctx, "annual_living_est", "year", /living|maintenance/);
        if (living) evidence.push({ ...living, field: "annual_living_est" });
        const acc = extractMoney(p.text, ctx, "accommodation_cost", "year", /accommodation|housing|room/);
        if (acc) evidence.push({ ...acc, field: "accommodation_cost" });
      }
      if (scopes.includes("requirements") && pageTypeIs(p, ["requirements", "admissions", "international"])) {
        const ielts = extractNumberReq(p.text, ctx, "min_ielts", "IELTS");
        if (ielts) evidence.push(ielts);
        if (ai?.ielts != null) evidence.push({ field: "min_ielts", value: ai.ielts, sourceUrl: ctx.url, sourceTitle: ctx.title, sourceType: ctx.sourceType, exactEvidence: "AI extraction", confidence: 0.6 });
        const toefl = extractNumberReq(p.text, ctx, "min_toefl", "TOEFL");
        if (toefl) evidence.push(toefl);
        const det = extractNumberReq(p.text, ctx, "min_det", "Duolingo");
        if (det) evidence.push(det);
        const pte = extractNumberReq(p.text, ctx, "min_pte", "PTE");
        if (pte) evidence.push(pte);
        const cambridge = extractNumberReq(p.text, ctx, "min_cambridge", "Cambridge");
        if (cambridge) evidence.push(cambridge);
        const sat = extractNumberReq(p.text, ctx, "min_sat", "SAT");
        if (sat) evidence.push(sat);
        const act = extractNumberReq(p.text, ctx, "min_act", "ACT");
        if (act) evidence.push(act);
        const gpa = extractNumberReq(p.text, ctx, "min_gpa", "GPA");
        if (gpa) evidence.push(gpa);
        // Text requirements: A-level grades, IB points, TMUA.
        const alevel = extractTextReq(p.text, ctx, "a_level_requirement", /(?:A\*?AA|AAA|AAB|ABB|BBB|A\*A\*A)[^\n.]{0,60}(?:A-level|A level)?/i);
        if (alevel) evidence.push(alevel);
        const ib = extractTextReq(p.text, ctx, "ib_requirement", /(?:International Baccalaureate|IB)\s+[^.]{0,80}\b\d{2}\s+points?\b/i);
        if (ib) evidence.push(ib);
        const tmua = extractTextReq(p.text, ctx, "subject_requirements", /TMUA[^.\n]{0,80}/i);
        if (tmua) evidence.push(tmua);
        // Explicit booleans (only when stated).
        const interview = extractFlagReq(p.text, ctx, "interview_required", /\binterview\b[^.\n]{0,60}(?:required|part of the|selection)/i);
        if (interview) evidence.push(interview);
        const recommendation = extractFlagReq(p.text, ctx, "recommendation_required", /\brecommendation\b[^.\n]{0,60}(?:required|need|request)/i);
        if (recommendation) evidence.push(recommendation);
        const personalStatement = extractFlagReq(p.text, ctx, "personal_statement_required", /\bpersonal statement\b[^.\n]{0,60}(?:required|needed)/i);
        if (personalStatement) evidence.push(personalStatement);
        // SAT/ACT required without minimum (spec §10) — only from explicit text.
        const satReq = extractRequiredFlag(p.text, ctx, "sat_required_no_min", "SAT");
        if (satReq) evidence.push(satReq);
        const actReq = extractRequiredFlag(p.text, ctx, "act_required_no_min", "ACT");
        if (actReq) evidence.push(actReq);
      }
      if (scopes.includes("university") && pageTypeIs(p, ["homepage", "international"])) {
        const f = extractFoundedYear(p.text, ctx);
        if (f) evidence.push(f);
        const ar = extractAcceptanceRate(p.text, ctx);
        if (ar) evidence.push(ar);
        const intl = extractIntlStudents(p.text, ctx);
        if (intl.count) evidence.push(intl.count);
        if (intl.pct) evidence.push(intl.pct);
        const fee = extractMoney(p.text, ctx, "application_fee", "application", /application|apply/);
        if (fee && /fee|apply|application/i.test(fee.exactEvidence)) evidence.push({ ...fee, field: "application_fee" });
      }
      if (scopes.includes("application_cycles") && pageTypeIs(p, ["deadline", "admissions"])) {
        const d = extractDeadline(p.text, ctx);
        if (d) evidence.push(d);
      }
      if (scopes.includes("sources")) {
        evidence.push({ field: "source_discovered", value: p.url, sourceUrl: ctx.url, sourceTitle: ctx.title, sourceType: ctx.sourceType, exactEvidence: "page discovered", confidence: 1 });
      }

      const extracted = evidence.length - before;
      if (extracted > 0) {
        for (const ev of evidence.slice(before)) {
          debug.extractionCounts[ev.field] = (debug.extractionCounts[ev.field] || 0) + 1;
        }
      } else {
        // ISSUE 1/12 — never silently discard a fetched page without results.
        const reason = p.type === "other"
          ? "page has no useful source category — no extraction scope applies"
          : "no supported field matched the page content (no money/requirement/deadline candidates)";
        progress(`Fetched but no supported field extracted: ${p.url} [${p.type}] "${(p.title || "").slice(0, 60)}" — ${reason}`);
        debug.pageNotes.push({
          url: p.url,
          category: p.type,
          title: (p.title || "").slice(0, 120),
          textLength: p.text.length,
          extracted: 0,
          reason,
        });
      }
    }
    // Pages that DID extract — one note each (reason omitted).
    for (const p of pages) {
      const count = evidence.filter((e) => e.sourceUrl === p.url).length;
      if (count > 0) {
        debug.pageNotes.push({ url: p.url, category: p.type, title: (p.title || "").slice(0, 120), textLength: p.text.length, extracted: count });
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
      // SAME decision logic for dry-run and real run — the dry-run report is
      // an exact preview of what a real run would write (CASE A–E).
      const decisions = decideUniversityFields(uniExtract, evidence, current);
      for (const d of decisions) {
        progress(
          `${d.field}: ${String(d.dbValue ?? "NULL")} → ${String(d.newValue ?? "NULL")}${d.currency ? ` ${d.currency}` : ""} — ${d.action.toUpperCase()} (${d.reason})`
        );
      }
      if (!dryRun) {
        const res = await writeUniversity(universityId, uniExtract, evidence, current);
        updatedFields.push(...res.updated);
        skippedFields.push(...res.skipped);
        reviewRequired.push(...res.review);
      } else {
        updatedFields.push(...decisions.filter((d) => d.action === "write" || d.action === "update"));
        skippedFields.push(...decisions.filter((d) => d.action === "skip"));
        reviewRequired.push(...decisions.filter((d) => d.action === "review"));
      }
    }

    // Programs (spec §3E) — ONLY real program pages become program records.
    // Generic hubs (/study/, /study/courses/, /faculties-and-departments/,
    // /research-and-innovation/) are discovery-only pages, never programs.
    if (scopes.includes("programs")) {
      progress("Processing programs...");
      const programPages = pages.filter((p) => p.type === "program").slice(0, AGENT_CONFIG.maxPrograms);
      for (const p of programPages) {
        const validation = validateProgramPage(p.url, p.title, p.text);
        if (!validation.ok || !validation.name) {
          discoveryOnly.push({
            url: p.url, title: p.title, type: p.type,
            reason: validation.reason || "not a program-specific page",
          });
          continue;
        }
        const name = validation.name.slice(0, 120);
        const t = best(evidence, "annual_tuition");
        const newTuition = t ? toNumber(t.value) ?? undefined : undefined;
        const existing = findExistingProgram(current.programs, name, p.url);
        const prog = {
          name,
          annualTuition: newTuition,
          tuitionCurrency: t?.currency,
          officialUrl: p.url,
        };

        if (existing) {
          // Dedupe hit (university_id + normalized name OR canonical URL).
          skippedFields.push({
            entity: "program",
            field: "name",
            action: "skip",
            dbValue: existing.name,
            newValue: name,
            sourceUrl: p.url,
            sourceTitle: p.title || p.url,
            sourceType: `official_${p.type}`,
            confidence: 1,
            reason: "CASE B: unchanged — program already exists (university_id + normalized name)",
          });
          progress(`Program '${name}' already exists — SKIPPED (unchanged)`);

          // Tuition: UPDATED only when a real field changed AND the existing
          // row is unverified (never weaken verified data).
          const dbTuition = toNumber(existing.tuitionAmount);
          if (t && newTuition != null && dbTuition !== newTuition && !existing.isVerified) {
            updatedFields.push({
              entity: "program",
              field: "annual_tuition",
              action: "update",
              dbValue: existing.tuitionAmount,
              newValue: newTuition,
              currency: t.currency,
              sourceUrl: t.sourceUrl,
              sourceTitle: t.sourceTitle,
              sourceType: t.sourceType,
              confidence: t.confidence,
              reason: "CASE C: program tuition changed — official source supersedes unverified value",
            });
            progress(`Program '${name}' tuition ${String(existing.tuitionAmount ?? "NULL")} → ${newTuition} ${t.currency ?? ""} — UPDATED`);
          } else if (t && newTuition != null && dbTuition === newTuition) {
            skippedFields.push({
              entity: "program",
              field: "annual_tuition",
              action: "skip",
              dbValue: existing.tuitionAmount,
              newValue: newTuition,
              currency: t.currency,
              sourceUrl: t.sourceUrl,
              sourceTitle: t.sourceTitle,
              sourceType: t.sourceType,
              confidence: t.confidence,
              reason: "CASE B: unchanged — program tuition identical to DB",
            });
          } else if (t && newTuition != null && existing.isVerified) {
            skippedFields.push({
              entity: "program",
              field: "annual_tuition",
              action: "skip",
              dbValue: existing.tuitionAmount,
              newValue: newTuition,
              currency: t.currency,
              sourceUrl: t.sourceUrl,
              sourceTitle: t.sourceTitle,
              sourceType: t.sourceType,
              confidence: t.confidence,
              reason: "CASE E: program verified — new source is not clearly stronger; verified data kept",
            });
          }
          if (!dryRun) {
            await upsertProgram(universityId, prog, p.url);
          }
        } else {
          progress(`New program found: '${name}' — would insert`);
          insertedPrograms.push(name);
          if (!dryRun) {
            const res = await upsertProgram(universityId, prog, p.url);
            if (!res.inserted) duplicatesPrevented += 1;
          }
        }
      }
    }

    // Requirements per program (spec §9, §10) — ALL existing+new programs,
    // dry-run compares against the current DB rows (SKIPPED when unchanged).
    if (scopes.includes("requirements")) {
      progress("Processing requirements...");
      const progs = dryRun
        ? current.programs
        : (await readCurrent(universityId)).programs;
      const satReq = best(evidence, "sat_required_no_min");
      const actReq = best(evidence, "act_required_no_min");
      const req = {
        minIelts: toNumber(best(evidence, "min_ielts")?.value) ?? undefined,
        minToefl: toNumber(best(evidence, "min_toefl")?.value) ?? undefined,
        minDet: toNumber(best(evidence, "min_det")?.value) ?? undefined,
        minSat: toNumber(best(evidence, "min_sat")?.value) ?? undefined,
        minAct: toNumber(best(evidence, "min_act")?.value) ?? undefined,
        minGpa: toNumber(best(evidence, "min_gpa")?.value) ?? undefined,
        ibRequirement: typeof best(evidence, "ib_requirement")?.value === "string" ? String(best(evidence, "ib_requirement")!.value) : undefined,
        aLevelRequirement: typeof best(evidence, "a_level_requirement")?.value === "string" ? String(best(evidence, "a_level_requirement")!.value) : undefined,
        subjectRequirements: typeof best(evidence, "subject_requirements")?.value === "string" ? String(best(evidence, "subject_requirements")!.value) : undefined,
        interviewRequired: best(evidence, "interview_required")?.value === true,
        recommendationRequired: best(evidence, "recommendation_required")?.value === true,
        personalStatementRequired: best(evidence, "personal_statement_required")?.value === true,
        otherRequirements: [
          best(evidence, "min_pte") ? `PTE Academic ${String(best(evidence, "min_pte")!.value)}` : "",
          best(evidence, "min_cambridge") ? `Cambridge English Scale ${String(best(evidence, "min_cambridge")!.value)}` : "",
          satReq ? "SAT required — no minimum published." : "",
          actReq ? "ACT required — no minimum published." : "",
        ].filter(Boolean).join(" ") || undefined,
      };
      const hasAnyReqEvidence =
        req.minIelts != null || req.minToefl != null || req.minDet != null || req.minSat != null ||
        req.minAct != null || req.minGpa != null || req.ibRequirement != null || req.aLevelRequirement != null ||
        req.subjectRequirements != null || req.interviewRequired || req.recommendationRequired ||
        req.personalStatementRequired || req.otherRequirements != null;

      for (const p of progs.slice(0, AGENT_CONFIG.maxPrograms)) {
        const reqSource = best(evidence, "min_ielts")?.sourceUrl || best(evidence, "a_level_requirement")?.sourceUrl || "";
        if (dryRun) {
          if (!hasAnyReqEvidence) {
            skippedFields.push({
              entity: "program.requirements", field: "requirements", action: "skip",
              dbValue: "existing row", newValue: "no new requirement evidence found",
              sourceUrl: "", reason: "no requirement evidence extracted from official pages — nothing to change",
            });
            continue;
          }
          const reqMap: [keyof typeof req, string][] = [
            ["minIelts", "min_ielts"], ["minToefl", "min_toefl"], ["minDet", "min_det"],
            ["minSat", "min_sat"], ["minAct", "min_act"], ["minGpa", "min_gpa"],
            ["ibRequirement", "ib_requirement"], ["aLevelRequirement", "a_level_requirement"],
            ["subjectRequirements", "subject_requirements"],
            ["interviewRequired", "interview_required"],
            ["recommendationRequired", "recommendation_required"],
            ["personalStatementRequired", "personal_statement_required"],
            ["otherRequirements", "other_requirements"],
          ];
          for (const [key, evField] of reqMap) {
            const newVal = req[key];
            if (newVal === undefined || newVal === null || newVal === false) continue;
            const ev = best(evidence, evField);
            const dbVal = (p as any)[key];
            if (dbVal != null && String(dbVal) === String(newVal)) {
              skippedFields.push({
                entity: "program.requirements", field: evField, action: "skip",
                dbValue: dbVal, newValue: newVal,
                sourceUrl: ev?.sourceUrl || reqSource,
                sourceTitle: ev?.sourceTitle, sourceType: ev?.sourceType, confidence: ev?.confidence,
                reason: "CASE B: unchanged — requirement identical to DB",
              });
            } else if (dbVal == null) {
              updatedFields.push({
                entity: "program.requirements", field: evField, action: "write",
                dbValue: null, newValue: newVal,
                sourceUrl: ev?.sourceUrl || reqSource,
                sourceTitle: ev?.sourceTitle, sourceType: ev?.sourceType, confidence: ev?.confidence,
                reason: "CASE A: DB requirement empty — official page fills the gap",
              });
            } else {
              updatedFields.push({
                entity: "program.requirements", field: evField, action: "update",
                dbValue: dbVal, newValue: newVal,
                sourceUrl: ev?.sourceUrl || reqSource,
                sourceTitle: ev?.sourceTitle, sourceType: ev?.sourceType, confidence: ev?.confidence,
                reason: "CASE C: requirement changed on the official page",
              });
            }
          }
        } else if (hasAnyReqEvidence) {
          const ok = await upsertRequirements(p.id, req, reqSource, best(evidence, "min_ielts")?.sourceYear);
          if (ok) updatedRequirements.push(p.name);
        }
      }
    }

    // Application cycles (spec §11) — dry-run dedupes against existing DB rows.
    if (scopes.includes("application_cycles")) {
      progress("Processing application cycles...");
      const deadlineEv = best(evidence, "deadline");
      if (deadlineEv) {
        const cycle = {
          academicYear: /20\d\d/.exec(deadlineEv.exactEvidence)?.[0] || undefined,
          deadline: typeof deadlineEv.value === "string" ? deadlineEv.value : undefined,
          applicationType: /early/i.test(deadlineEv.exactEvidence) ? "Early Action" : /regular/i.test(deadlineEv.exactEvidence) ? "Regular Decision" : undefined,
          applicationFee: toNumber(best(evidence, "application_fee")?.value) ?? undefined,
          applicationFeeCurrency: normalizeCurrency(best(evidence, "application_fee")?.currency) ?? undefined,
        };
        const existing = current.cycles.find(
          (c) =>
            (c.deadline ? (toIsoDate(c.deadline) ?? "") : "") === (cycle.deadline ?? "") &&
            (c.academicYear ?? "") === (cycle.academicYear ?? "")
        );
        if (existing) {
          skippedFields.push({
            entity: "application_cycle", field: "deadline", action: "skip",
            dbValue: existing.deadline, newValue: cycle.deadline,
            sourceUrl: deadlineEv.sourceUrl, sourceTitle: deadlineEv.sourceTitle,
            sourceType: deadlineEv.sourceType, confidence: deadlineEv.confidence,
            reason: "CASE B: unchanged — application deadline already in DB",
          });
          progress(`Application deadline ${cycle.deadline} already in DB — SKIPPED (unchanged)`);
        } else {
          insertedCycles.push(`${cycle.applicationType || "Application"} ${cycle.deadline}`);
          progress(`Application deadline ${cycle.deadline} — would insert`);
        }
        if (!dryRun && !existing) {
          const res = await upsertCycle(universityId, cycle, deadlineEv.sourceUrl);
          if (!res.inserted) duplicatesPrevented += 1;
        }
      }
    }

    // Scholarships (spec §12) — amount_usd ONLY for USD sources. Dry-run
    // dedupes against existing rows by normalized title / URL.
    if (scopes.includes("scholarships")) {
      progress("Processing scholarships...");
      const schPages = pages.filter((p) => p.type === "scholarship").slice(0, 6);
      for (const p of schPages) {
        const t = extractMoney(p.text, ctxFor(p), "scholarship_amount", "year", /scholarship|award|grant/);
        // Real scholarship title from the page heading (never a generic label).
        const title = (firstHeading(p.text) || p.title || "University Scholarship").slice(0, 150);
        const sch = {
          title,
          websiteUrl: p.url,
          amountUsd: t?.currency === "USD" ? toNumber(t.value) ?? undefined : undefined,
          currency: t?.currency,
          amountOriginal: t?.currency && t.currency !== "USD" ? toNumber(t.value) ?? undefined : undefined,
        };
        const existing = current.scholarships.find(
          (x) => normalizeNameKey(x.title || "") === normalizeNameKey(title) || normalizeUrl(String(x.websiteUrl || "")) === normalizeUrl(p.url)
        );
        if (existing) {
          skippedFields.push({
            entity: "scholarship", field: "title", action: "skip",
            dbValue: existing.title, newValue: title,
            sourceUrl: p.url, sourceTitle: p.title || p.url, sourceType: `official_${p.type}`, confidence: 1,
            reason: "CASE B: unchanged — scholarship already in DB (normalized title/URL match)",
          });
          progress(`Scholarship '${title}' already in DB — SKIPPED (unchanged)`);
          if (!dryRun) {
            const res = await upsertScholarship(sch, p.url);
            if (!res.inserted) duplicatesPrevented += 1;
          }
        } else {
          insertedScholarships.push(title);
          progress(`Scholarship '${title}' — would insert`);
          if (!dryRun) {
            const res = await upsertScholarship(sch, p.url);
            if (!res.inserted) duplicatesPrevented += 1;
          }
        }
      }
    }

    // Sources (spec §4, §5, §7) — DISCOVERY PAGE != EVIDENCE PAGE.
    // Only two kinds of pages are persisted as sources:
    //  1. pages that support a specific extracted field (evidence-backed), and
    //  2. high-value canonical pages with a useful source category:
    //     homepage, admissions, international, program (validated),
    //     tuition, living_costs, deadline, requirements, scholarship.
    // Generic navigation pages (/about-the-site/accessibility/, /faculties-...,
    // /research-and-innovation/, generic /study/) stay discovery-only and are
    // reported in report.discoveryOnly — never persisted.
    if (scopes.includes("sources")) {
      progress("Persisting verified sources...");
      const PERSISTABLE_CATEGORIES = new Set([
        "homepage", "admissions", "international", "program",
        "tuition", "living_costs", "deadline", "requirements", "scholarship",
      ]);
      const pageTextByUrl = new Map(pages.map((p) => [p.url, p.text]));
      const isAcceptableSource = (url: string, title: string, type: string): { ok: boolean; reason?: string } => {
        const reason = rejectSourceReason(url);
        if (reason) return { ok: false, reason };
        const t = (type || "").toLowerCase();
        if (t.includes("other") && !isMeaningfulSourceTitle(title)) {
          return { ok: false, reason: "generic 'other' page without a meaningful title" };
        }
        return { ok: true };
      };
      /** High-value page gate: useful category AND (for programs) real program page. */
      const canPersistDiscovered = (d: { url: string; title: string; type: string }): { ok: boolean; reason?: string } => {
        if (!PERSISTABLE_CATEGORIES.has(d.type)) {
          return { ok: false, reason: "generic navigation page — no useful source category (discovery only)" };
        }
        if (d.type === "program") {
          const v = validateProgramPage(d.url, d.title, pageTextByUrl.get(d.url) ?? "");
          if (!v.ok) return { ok: false, reason: v.reason || "generic hub page (discovery only)" };
        }
        return { ok: true };
      };

      const persistPage = async (d: { url: string; title: string; type: string }) => {
        if (!dryRun) {
          const dc = ctxFor(d);
          const res = await upsertSource(
            { field: "page_discovered", value: d.url, sourceUrl: dc.url, sourceTitle: dc.title, sourceType: dc.sourceType, exactEvidence: "discovered", confidence: 1 },
            universityId
          );
          if (res.rejected) {
            rejectedSources.push({ url: d.url, reason: res.rejected });
            return;
          }
          if (res.inserted) newSources.push({ url: dc.url, title: dc.title });
          if (res.duplicate) duplicatesPrevented += 1;
        } else {
          const check = isAcceptableSource(d.url, d.title, ctxFor(d).sourceType);
          if (!check.ok) {
            rejectedSources.push({ url: d.url, reason: check.reason! });
            return;
          }
          newSources.push({ url: d.url, title: d.title });
        }
      };

      // 1. Evidence-backed sources (always persist — they support a field).
      //    Evidence whose page category is "other" is never persisted.
      const evidencePages = evidence.filter(
        (e) => e.field !== "source_discovered" && !(e.sourceType || "").toLowerCase().includes("other")
      );
      if (!dryRun) {
        for (const ev of evidencePages) {
          const res = await upsertSource(ev, universityId);
          if (res.rejected) {
            rejectedSources.push({ url: ev.sourceUrl, reason: res.rejected });
            continue;
          }
          if (res.inserted) newSources.push({ url: ev.sourceUrl, title: ev.sourceTitle });
          if (res.duplicate) duplicatesPrevented += 1;
        }
      } else {
        const added = new Set<string>();
        for (const ev of evidencePages) {
          if (added.has(ev.sourceUrl)) continue;
          const check = isAcceptableSource(ev.sourceUrl, ev.sourceTitle, ev.sourceType);
          if (!check.ok) {
            rejectedSources.push({ url: ev.sourceUrl, reason: check.reason! });
            continue;
          }
          added.add(ev.sourceUrl);
          newSources.push({ url: ev.sourceUrl, title: ev.sourceTitle });
        }
      }

      // 2. High-value discovered pages only — generic navigation stays crawl-only.
      for (const d of discovered.slice(0, maxPages)) {
        const gate = canPersistDiscovered(d);
        if (!gate.ok) {
          discoveryOnly.push({ url: d.url, title: d.title, type: d.type, reason: gate.reason! });
          continue;
        }
        await persistPage(d);
      }
    }

    // STEP — read back + audit (spec §15)
    progress("Re-reading database & auditing...");
    const after = await readCurrent(universityId);
    sourcesReadBack = after.sourceUrls.size;

    const report = buildReport({
      universityId, universityName, dryRun, updatedFields, skippedFields, reviewRequired,
      insertedPrograms, updatedRequirements, insertedCycles, insertedScholarships,
      newSources, rejectedSources, discoveryOnly, debug, errors, sourcesReadBack, duplicatesPrevented,
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
      newSources, rejectedSources, discoveryOnly, debug, errors, sourcesReadBack, duplicatesPrevented,
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
