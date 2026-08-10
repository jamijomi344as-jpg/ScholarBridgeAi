import { NextResponse } from "next/server";
import { db } from "@/db";
import { certificates, courses, studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Public certificate verification by unique code. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const [cert] = await db
      .select({
        id: certificates.id,
        certificateCode: certificates.certificateCode,
        issuedAt: certificates.issuedAt,
        courseTitle: courses.title,
        profileName: studentProfiles.name,
      })
      .from(certificates)
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .innerJoin(studentProfiles, eq(certificates.profileId, studentProfiles.id))
      .where(eq(certificates.certificateCode, code));

    if (!cert) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    return NextResponse.json({ valid: true, certificate: cert });
  } catch (error) {
    console.error("GET /api/certificates/verify error:", error);
    return NextResponse.json({ error: "Failed to verify certificate" }, { status: 500 });
  }
}
