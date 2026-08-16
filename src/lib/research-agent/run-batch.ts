/**
 * Batch runner (spec §17) — sequential, rate-limited, per-university audit.
 */
import { runUniversity } from "./run-university";
import { AGENT_CONFIG } from "./config";
import { sleep } from "./fetch";
import type { AuditReport, RunRequest } from "./types";

export async function runBatch(
  request: RunRequest,
  progress: (universityId: number, message: string) => void,
  isCancelled: () => boolean = () => false
): Promise<{ reports: AuditReport[]; errors: string[] }> {
  const reports: AuditReport[] = [];
  const errors: string[] = [];

  for (const id of request.universityIds) {
    if (isCancelled()) {
      errors.push("Cancelled by user");
      break;
    }
    progress(id, `Starting university #${id}...`);
    try {
      const report = await runUniversity(id, request.scopes, request.dryRun ?? false, (m) => progress(id, m));
      reports.push(report);
    } catch (err: any) {
      errors.push(`#${id}: ${err?.message || err}`);
    }
    // Sequential + rate limit (spec §17, §21)
    await sleep(AGENT_CONFIG.batchDelayMs);
  }

  return { reports, errors };
}
