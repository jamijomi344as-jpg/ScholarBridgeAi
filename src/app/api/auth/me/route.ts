import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Returns the current session user + their linked student_profile.
 *
 * Session resolution order:
 *   1. cookies (normal SSR flow)
 *   2. `Authorization: Bearer <access_token>` header — fallback used when
 *      the browser client holds the session but the server could not read
 *      the cookies (e.g. chunked-cookie edge cases on Render). The client
 *      can always read its own cookies, so it passes the token explicitly.
 *
 * Auto-links legacy profiles (created before auth existed) by email:
 * if a profile has the same email and no auth_user_id yet, it is claimed
 * by this user — this is how the existing Hushnudbek admin account keeps
 * working after the switch to real auth.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // 1) Cookie-based session.
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // 2) Bearer-token fallback.
    if (!user) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data } = await supabase.auth.getUser(token);
        user = data.user ?? null;
      }
    }

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
