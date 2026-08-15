import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultingRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/** POST: submit a consulting request (spec §27). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, topic, message, preferredContact } = body;
    if (!profileId || !topic) {
      return NextResponse.json({ error: "profileId and topic are required" }, { status: 400 });
    }
    const [row] = await db
      .insert(consultingRequests)
      .values({
        profileId: Number(profileId),
        topic: String(topic),
        message: String(message || ""),
        preferredContact: String(preferredContact || ""),
      })
      .returning();
    return NextResponse.json({ request: row });
  } catch (error) {
    console.error("POST /api/consulting error:", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

/** GET: list consulting requests for a profile. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const rows = await db
      .select()
      .from(consultingRequests)
      .where(eq(consultingRequests.profileId, profileId))
      .orderBy(desc(consultingRequests.createdAt));
    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error("GET /api/consulting error:", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}
