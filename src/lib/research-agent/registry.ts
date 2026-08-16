/**
 * In-memory run registry — tracks progress for the admin UI.
 * Server-side only; lost on restart (acceptable for MVP, spec §20).
 */
import type { RunStatus } from "./types";

const runs = new Map<string, RunStatus>();

export function createRun(universityId: number | null): string {
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  runs.set(runId, {
    runId,
    universityId,
    state: "idle",
    progress: [],
    report: null,
    startedAt: Date.now(),
  });
  return runId;
}

export function getRun(runId: string): RunStatus | null {
  return runs.get(runId) ?? null;
}

export function setRun(runId: string, patch: Partial<RunStatus>) {
  const r = runs.get(runId);
  if (!r) return;
  runs.set(runId, { ...r, ...patch });
}

export function appendProgress(runId: string, message: string) {
  const r = runs.get(runId);
  if (!r) return;
  runs.set(runId, { ...r, progress: [...r.progress.slice(-40), message] });
}

export function listRuns(): RunStatus[] {
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, 20);
}
