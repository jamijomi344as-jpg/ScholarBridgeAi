import { NextResponse } from "next/server";
import { db } from "@/db";
import { certificates, courses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const profileId = parseInt(profileIdStr, 10);

    const rows = await db
      .select({
        id: certificates.id,
        profileId: certificates.profileId,
        courseId: certificates.courseId,
        certificateCode: certificates.certificateCode,
        issuedAt: certificates.issuedAt,
        courseTitle: courses.title,
      })
      .from(certificates)
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.profileId, profileId))
      .orderBy(desc(certificates.issuedAt));

    return NextResponse.json({ certificates: rows });
  } catch (error) {
    console.error("GET /api/certificates error:", error);
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
  }
}
