import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getTotalUsers, getNewUsersThisMonth, getActiveSubscribers } from "@/lib/analytics";

/**
 * Admin analytics endpoint (server-side only).
 * Protected by the same is_admin check used by every admin API in the app.
 * The three metrics are computed with the server-side Drizzle pool — the
 * database connection is never exposed to the client.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");

    if (!(await isAdmin(adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const [totalUsers, newUsersThisMonth, activeSubscribers] = await Promise.all([
      getTotalUsers(),
      getNewUsersThisMonth(),
      getActiveSubscribers(),
    ]);

    return NextResponse.json({
      totalUsers,
      newUsersThisMonth,
      activeSubscribers,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
