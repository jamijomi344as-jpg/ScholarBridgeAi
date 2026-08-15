import type { scholarships } from "@/db/schema";

export type ScholarshipApplicationStatus =
  | "open"
  | "closed"
  | "upcoming"
  | "rolling"
  | "not_announced"
  | "unknown";

export type DeadlineType =
  | "exact"
  | "range"
  | "rolling"
  | "multiple_rounds"
  | "not_announced"
  | "recurring"
  | "unknown";

interface ScholarshipLike {
  openingDate: string | Date | null;
  deadlineDate: string | Date | null;
  deadlineType: string | null;
  deadlineRangeStart: string | Date | null;
  deadlineRangeEnd: string | Date | null;
  rounds: string | null;
  recurrence: string | null;
  expectedOpeningPeriod: string | null;
  expectedDeadlinePeriod: string | null;
  isActive: boolean | null;
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Compute the current application status from dates (spec §6).
 * Pure function — the UI and API both use it, so status is always consistent.
 */
export function computeScholarshipStatus(s: ScholarshipLike): ScholarshipApplicationStatus {
  const now = new Date();
  const opening = toDate(s.openingDate);
  const deadline = toDate(s.deadlineDate);
  const rangeStart = toDate(s.deadlineRangeStart);
  const rangeEnd = toDate(s.deadlineRangeEnd);

  if (s.deadlineType === "rolling") return "rolling";
  if (s.deadlineType === "not_announced") return "not_announced";

  // Exact deadline known.
  if (deadline) {
    if (opening && now < opening) return "upcoming";
    if (now <= deadline) return "open";
    return "closed";
  }

  // Deadline range.
  if (rangeStart && rangeEnd) {
    if (opening && now < opening) return "upcoming";
    if (now >= rangeStart && now <= rangeEnd) return "open";
    if (now > rangeEnd) return "closed";
    if (now < rangeStart) return "upcoming";
  }

  // Multiple rounds: check the latest round deadline.
  if (s.rounds && s.rounds !== "[]") {
    try {
      const rounds = JSON.parse(s.rounds) as { deadline?: string }[];
      const deadlines = rounds
        .map((r) => toDate(r.deadline))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => b.getTime() - a.getTime());
      if (deadlines.length > 0) {
        const latest = deadlines[0];
        if (now <= latest) return "open";
        return "closed";
      }
    } catch {
      // ignore malformed rounds
    }
  }

  // Recurring with expected period only.
  if (s.recurrence === "annual" && (s.expectedOpeningPeriod || s.expectedDeadlinePeriod)) {
    return "not_announced";
  }

  return "unknown";
}

/** Human-friendly label + a note that the status was computed, not stored. */
export function statusLabel(status: ScholarshipApplicationStatus): string {
  switch (status) {
    case "open":
      return "OPEN";
    case "closed":
      return "CLOSED";
    case "upcoming":
      return "UPCOMING";
    case "rolling":
      return "ROLLING";
    case "not_announced":
      return "DATE NOT ANNOUNCED";
    default:
      return "UNKNOWN";
  }
}

/** Spec §7: clearly label estimated dates from historical cycles. */
export function expectedPeriodLabel(s: ScholarshipLike): string | null {
  if (s.recurrence === "annual" && s.expectedDeadlinePeriod) {
    return `Expected based on previous cycles: ${s.expectedDeadlinePeriod}`;
  }
  if (s.recurrence === "annual" && s.expectedOpeningPeriod) {
    return `Expected based on previous cycles: opens around ${s.expectedOpeningPeriod}`;
  }
  return null;
}

export type ScholarshipWithStatus = typeof scholarships.$inferSelect & {
  computedStatus: ScholarshipApplicationStatus;
  statusLabel: string;
  expectedLabel: string | null;
};

/** Attach computed status fields to a scholarship row. */
export function withStatus(s: ScholarshipLike & Record<string, unknown>): ScholarshipWithStatus {
  const computedStatus = computeScholarshipStatus(s);
  return {
    ...s,
    computedStatus,
    statusLabel: statusLabel(computedStatus),
    expectedLabel: expectedPeriodLabel(s),
  } as ScholarshipWithStatus;
}
