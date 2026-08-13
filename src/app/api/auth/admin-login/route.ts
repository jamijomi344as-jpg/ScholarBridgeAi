import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * Admin sign-in: username (full name) + email of the owner's admin account.
 * Only is_admin profiles can sign in here — regular students' profiles stay
 * private (a new visitor can never see or enter someone else's account).
 *
 * NOTE: this is a lightweight security gate until real auth is added.
 * The admin credentials are ADMIN_NAME / ADMIN_EMAIL (defaults: Hushnudbek /
 * hushnudbek@gmail.com), seeded by src/db/seed.ts on every load.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();

    if (!username || !email) {
      return NextResponse.json(
        { error: "Username and email are required" },
        { status: 400 }
      );
    }

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(
        sql`lower(${studentProfiles.name}) = ${username} AND lower(${studentProfiles.email}) = ${email} AND ${studentProfiles.isAdmin} = true`
      )
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Invalid username or email" }, { status: 401 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("POST /api/auth/admin-login error:", error);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
