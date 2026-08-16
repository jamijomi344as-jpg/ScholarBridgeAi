/**
 * Audit & logging (spec §15, §19).
 * Uses existing refresh_jobs table when available; falls back to console
 * without failing (the table may not exist in some deployments).
 */
import { db } from "@/db";
import { refreshJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AuditReport } from "./types";

/** Create a run log row (best-effort). Returns log id or null. */
export async function logRunStart(universityId: number, scopes: string[]): Promise<number | null> {
  try {
    const [row] = await db
      .insert(refreshJobs)
      .values({
        jobType: `research_agent:${universityId}`,
        trigger: "manual",
        status: "running",
        startedAt: new Date(),
      })
      .returning();
    return row.id;
  } catch {
    console.log(`[research-agent] run start (log table unavailable): university ${universityId}, scopes ${scopes.join(",")}`);
    return null;
  }
}

/** Finish a run log row (best-effort). */
export async function logRunFinish(logId: number | null, report: AuditReport | null, error?: string) {
  if (!logId) {
    console.log(
      `[research-agent] run finish: ${error ? `ERROR ${error}` : `ok (${report?.updatedFields.length ?? 0} updated)`}`
    );
    return;
  }
  try {
    await db
      .update(refreshJobs)
      .set({
        status: error ? "failed" : "success",
        itemsProcessed: report?.updatedFields.length ?? 0,
        itemsChanged:
          (report?.insertedPrograms.length ?? 0) +
          (report?.insertedCycles.length ?? 0) +
          (report?.insertedScholarships.length ?? 0),
        error: error ?? null,
        finishedAt: new Date(),
      })
      .where(eq(refreshJobs.id, logId));
  } catch {
    // log unavailable — ignore
  }
}

/** Build the final audit report from collected counters (spec §15). */
export function buildReport(input: {
  universityId: number;
  universityName: string;
  dryRun: boolean;
  updatedFields: string[];
  skippedFields: string[];
  reviewRequired: string[];
  insertedPrograms: string[];
  updatedRequirements: string[];
  insertedCycles: string[];
  insertedScholarships: string[];
  newSources: { url: string; title: string }[];
  errors: string[];
  sourcesReadBack: number;
  duplicatesPrevented: number;
}): AuditReport {
  return {
    universityId: input.universityId,
    universityName: input.universityName,
    dryRun: input.dryRun,
    updatedFields: input.updatedFields.map((f) => ({
      field: f,
      action: "write",
      dbValue: null,
      newValue: null,
      sourceUrl: "",
      reason: "",
    })),
    insertedPrograms: input.insertedPrograms,
    updatedRequirements: input.updatedRequirements,
    insertedCycles: input.insertedCycles,
    insertedScholarships: input.insertedScholarships,
    newSources: input.newSources,
    skippedFields: input.skippedFields,
    reviewRequired: input.reviewRequired,
    errors: input.errors,
    sourcesReadBack: input.sourcesReadBack,
    duplicatesPrevented: input.duplicatesPrevented,
  };
}
