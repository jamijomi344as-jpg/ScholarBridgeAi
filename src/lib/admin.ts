import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";

/**
 * Returns true when the given profile id belongs to a student profile
 * flagged as an admin (is_admin). Any falsy/invalid id is rejected.
 */
export async function isAdmin(
  profileId: number | string | null | undefined
): Promise<boolean> {
  if (profileId === null || profileId === undefined || profileId === "") {
    return false;
  }
  const id = Number(profileId);
  if (!Number.isFinite(id) || id <= 0) return false;

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, id));

  return !!profile?.isAdmin;
}
