import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Creates (or claims) the student_profile for the current auth user.
 *
 *   - profile with auth_user_id == user.id  → return it
 *   - legacy profile with same email (auth_user_id NULL) → claim it
 *   - otherwise → create a fresh empty profile (name from body or email)
 *
 * Called by the onboarding wizard on its first step.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || user.email || "").trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // 1) Already linked.
    const [linked] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.authUserId, user.id));
    if (linked) {
      return NextResponse.json({ profile: linked });
    }

    // 2) Legacy claim by email.
    const [legacy] = await db
      .select()
      .from(studentProfiles)
      .where(
        sql`lower(${studentProfiles.email}) = ${email} AND ${studentProfiles.authUserId} IS NULL`
      )
      .limit(1);
    if (legacy) {
      const [claimed] = await db
        .update(studentProfiles)
        .set({ authUserId: user.id, name: legacy.name || name })
        .where(eq(studentProfiles.id, legacy.id))
        .returning();
      return NextResponse.json({ profile: claimed });
    }

    // 3) Create fresh profile (empty academic fields, filled later by wizard).
    const [created] = await db
      .insert(studentProfiles)
      .values({
        authUserId: user.id,
        name: name || (user.email || "Student").split("@")[0],
        email,
        degreeLevel: "Master",
        targetMajor: "Computer Science",
        gpa: 3.5,
        gpaScale: 4.0,
        budgetAnnualUsd: 25000,
        preferredCountries: JSON.stringify(["United States", "United Kingdom", "Canada", "Germany"]),
        needScholarship: true,
        onboardingStep: 0,
        onboardingCompleted: false,
      })
      .returning();

    return NextResponse.json({ profile: created });
  } catch (error) {
    console.error("POST /api/auth/profile error:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
