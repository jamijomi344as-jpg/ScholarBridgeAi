import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { desc, gte, eq, and } from "drizzle-orm";

interface UsageEntry {
  profileId: number | null;
  taskType: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costEstimate: number;
  status: string;
}

/** Record one AI request (spec §16 — request logging & usage tracking). */
export async function logAIUsage(entry: UsageEntry) {
  await db.insert(aiUsage).values({
    profileId: entry.profileId,
    taskType: entry.taskType,
    provider: entry.provider,
    model: entry.model,
    promptTokens: entry.promptTokens,
    completionTokens: entry.completionTokens,
    costEstimate: entry.costEstimate,
    status: entry.status,
  });
}

/** Count AI requests for a profile since a given timestamp (free quota). */
export async function countAIRequestsSince(profileId: number, since: Date): Promise<number> {
  const rows = await db
    .select({ id: aiUsage.id })
    .from(aiUsage)
    .where(and(eq(aiUsage.profileId, profileId), gte(aiUsage.createdAt, since)));
  return rows.length;
}

/** Recent usage for admin (spec §16). */
export async function getRecentUsage(limit = 50) {
  return db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(limit);
}

/** Total tokens for a profile today (quota check). */
export async function getDailyTokens(profileId: number): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ pt: aiUsage.promptTokens, ct: aiUsage.completionTokens })
    .from(aiUsage)
    .where(and(eq(aiUsage.profileId, profileId), gte(aiUsage.createdAt, start)));
  return rows.reduce((sum, r) => sum + (r.pt ?? 0) + (r.ct ?? 0), 0);
}
