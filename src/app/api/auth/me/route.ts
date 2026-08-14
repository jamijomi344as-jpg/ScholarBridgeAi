import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq, sql, isNull } from "drizzle-orm";

/**
 * Returns the current session user + their linked student_profile.
 * Auto-links legacy profiles (created before auth existed) by email:
 * if a profile has the same email and no auth_user_id yet, it is claimed
 * by this user — this is how the existing Hushnudbek admin account keeps
 * working after the switch to real auth.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null, profile: null });
    }

    // 1) Direct match by auth_user_id.
    let [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.authUserId, user.id));

    // 2) Legacy claim: same email, not yet linked to any auth user.
    if (!profile && user.email) {
      const matches = await db
        .select()
        .from(studentProfiles)
        .where(
          sql`lower(${studentProfiles.email}) = ${user.email.toLowerCase()} AND ${studentProfiles.authUserId} IS NULL`
        )
        .limit(1);
      if (matches[0]) {
        [profile] = await db
          .update(studentProfiles)
          .set({ authUserId: user.id })
          .where(eq(studentProfiles.id, matches[0].id))
          .returning();
      }
    }

    return NextResponse.json({ user, profile: profile ?? null });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
