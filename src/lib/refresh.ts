import { db } from "@/db";
import { refreshJobs, scholarships, universities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { computeScholarshipStatus } from "@/lib/scholarshipStatus";

/**
 * Data-refresh pipeline (spec §5, §9).
 *
 * Lifecycle: DISCOVERED → EXTRACTED → VALIDATION → SOURCE VERIFICATION →
 * CHANGE DETECTION → DATABASE UPDATE → USER NOTIFICATION.
 *
 * Current implementation provides the framework + manual/individual refresh
 * with job logging. Real source adapters (official university/scholarship
 * pages) plug into discovery — each adapter returns normalized candidate
 * records that go through validation before touching the DB.
 */

export interface RefreshResult {
  processed: number;
  changed: number;
  discovered: number;
  errors: string[];
}

export async function createRefreshJob(jobType: string, trigger = "manual") {
  const [job] = await db
    .insert(refreshJobs)
    .values({ jobType, trigger, status: "pending" })
    .returning();
  return job;
}

export async function startRefreshJob(jobId: number) {
  await db.update(refreshJobs).set({ status: "running", startedAt: new Date() }).where(eq(refreshJobs.id, jobId));
}

export async function finishRefreshJob(jobId: number, result: RefreshResult, error?: string) {
  await db
    .update(refreshJobs)
    .set({
      status: error ? "failed" : "success",
      itemsProcessed: result.processed,
      itemsChanged: result.changed,
      error: error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(refreshJobs.id, jobId));
}

/**
 * Run the refresh pipeline for a scope.
 * Until source adapters are registered, the pipeline keeps existing records
 * healthy: recomputes scholarship statuses from dates and flags stale
 * verification — never blindly overwrites data (spec §5).
 */
export async function runRefresh(scope: "all" | "scholarships" | "universities"): Promise<RefreshResult> {
  const job = await createRefreshJob(scope, "manual");
  await startRefreshJob(job.id);

  const result: RefreshResult = { processed: 0, changed: 0, discovered: 0, errors: [] };

  try {
    if (scope === "scholarships" || scope === "all") {
      const rows = await db.select().from(scholarships);
      result.processed += rows.length;
      for (const s of rows) {
        const status = computeScholarshipStatus(s);
        if (s.applicationStatus !== status) {
          await db
            .update(scholarships)
            .set({ applicationStatus: status, lastUpdatedAt: new Date() })
            .where(eq(scholarships.id, s.id));
          result.changed += 1;
        }
      }
    }

    if (scope === "universities" || scope === "all") {
      const rows = await db.select().from(universities);
      result.processed += rows.length;
      const oldThreshold = new Date(Date.now() - 180 * 86400000);
      for (const u of rows) {
        if (!u.lastVerifiedAt || u.lastVerifiedAt < oldThreshold) {
          if (u.verificationStatus !== "needs_verification") {
            await db
              .update(universities)
              .set({ verificationStatus: "needs_verification" })
              .where(eq(universities.id, u.id));
            result.changed += 1;
          }
        }
      }
    }

    await finishRefreshJob(job.id, result);
  } catch (err: any) {
    result.errors.push(String(err?.message || err));
    await finishRefreshJob(job.id, result, String(err?.message || err));
  }

  return result;
}

/** List recent jobs for the admin refresh center. */
export async function listRefreshJobs(limit = 30) {
  return db.select().from(refreshJobs).orderBy(desc(refreshJobs.createdAt)).limit(limit);
}
