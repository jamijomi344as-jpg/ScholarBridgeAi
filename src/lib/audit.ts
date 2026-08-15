import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export type AuditActor = "ADMIN" | "AUTOMATED_SYSTEM" | "AI" | "EXTERNAL_SOURCE";
export type AuditEntityType = "university" | "scholarship";

interface AuditEntry {
  entityType: AuditEntityType;
  entityId: number;
  fieldChanged: string;
  oldValue?: unknown;
  newValue?: unknown;
  source?: string;
  actor?: AuditActor;
  verificationStatus?: string;
}

function stringify(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Record a change in the audit log (spec §11). Every admin CRUD and every
 * automated update must call this so changes are traceable.
 */
export async function writeAudit(entry: AuditEntry) {
  try {
    await db.insert(auditLogs).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldChanged: entry.fieldChanged,
      oldValue: stringify(entry.oldValue),
      newValue: stringify(entry.newValue),
      source: entry.source ?? null,
      actor: entry.actor ?? "ADMIN",
      verificationStatus: entry.verificationStatus ?? "unverified",
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

/** Compare old vs new row and audit every changed field (spec §11). */
export async function auditRowChanges(
  entityType: AuditEntityType,
  entityId: number,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  opts: { actor?: AuditActor; source?: string; verificationStatus?: string } = {}
) {
  const changes: { field: string; old: unknown; new: unknown }[] = [];
  for (const key of Object.keys(newRow)) {
    const oldV = oldRow[key];
    const newV = newRow[key];
    if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
      changes.push({ field: key, old: oldV, new: newV });
    }
  }
  for (const c of changes) {
    await writeAudit({
      entityType,
      entityId,
      fieldChanged: c.field,
      oldValue: c.old,
      newValue: c.new,
      source: opts.source,
      actor: opts.actor ?? "ADMIN",
      verificationStatus: opts.verificationStatus ?? "verified",
    });
  }
  return changes.length;
}

/** Fetch audit entries (admin UI). */
export async function getAuditLogs(opts: {
  entityType?: string;
  entityId?: number;
  actor?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  const conditions = [];
  if (opts.entityType) conditions.push(eq(auditLogs.entityType, opts.entityType));
  if (opts.entityId) conditions.push(eq(auditLogs.entityId, opts.entityId));
  if (opts.actor) conditions.push(eq(auditLogs.actor, opts.actor));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = where
    ? await db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset)
    : await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  return rows;
}
