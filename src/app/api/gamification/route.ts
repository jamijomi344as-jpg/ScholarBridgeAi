import { NextResponse } from "next/server";
import { getGamification } from "@/lib/gamification";
import { seedGamification } from "@/db/seed";

export async function GET(req: Request) {
  try {
    await seedGamification();
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const profileId = parseInt(profileIdStr, 10);
    const snapshot = await getGamification(profileId);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET /api/gamification error:", error);
    return NextResponse.json({ error: "Failed to fetch gamification" }, { status: 500 });
  }
}
