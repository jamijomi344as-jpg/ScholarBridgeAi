import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { runRefresh, listRefreshJobs } from "@/lib/refresh";

/** POST: trigger a manual refresh (admin). GET: list refresh jobs. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const scope = body.scope === "universities" ? "universities" : body.scope === "scholarships" ? "scholarships" : "all";
    const result = await runRefresh(scope);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/admin/refresh error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (!(await isAdmin(searchParams.get("adminProfileId")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const jobs = await listRefreshJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("GET /api/admin/refresh error:", error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
}
