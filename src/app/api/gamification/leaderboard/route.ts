import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/gamification";
import { seedGamification } from "@/db/seed";

export async function GET() {
  try {
    await seedGamification();
    const leaderboard = await getLeaderboard(20);
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("GET /api/gamification/leaderboard error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
