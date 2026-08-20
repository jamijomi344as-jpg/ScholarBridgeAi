/**
 * Admin analytics queries (server-side only).
 *
 * Table mapping in this project:
 *   - "users"            → `student_profiles`  (the app's user table:
 *                          id, email, is_admin, is_premium, created_at)
 *   - "subscriptions"    → `subscriptions`     (profile_id FK → student_profiles,
 *                          status, current_period_end, created_at)
 *   - "payments"         → `payments`          (status, amount, created_at)
 *
 * All columns below already exist in the database — nothing was created or
 * renamed for these metrics.
 *
 * Supabase/RLS: this module runs through the server-side Drizzle pool
 * (DATABASE_URL, node-postgres) exactly like every other server query in the
 * app — the `db` handle is never exposed to the client, so the queries run
 * with full server privileges regardless of RLS policies.
 */
import { count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, subscriptions } from "@/db/schema";

/** Total registered users — count of all rows in student_profiles. */
export async function getTotalUsers(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(studentProfiles);
  return row?.value ?? 0;
}

/** Users registered since the start of the current calendar month. */
export async function getNewUsersThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [row] = await db
    .select({ value: count() })
    .from(studentProfiles)
    .where(gte(studentProfiles.createdAt, monthStart));
  return row?.value ?? 0;
}

/** Active paid subscribers — count of subscriptions with status = 'active'. */
export async function getActiveSubscribers(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  return row?.value ?? 0;
}
