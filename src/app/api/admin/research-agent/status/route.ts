import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getRun, listRuns } from "@/lib/research-agent/registry";

/** GET: poll a run's progress, or list recent runs. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (!(await isAdmin(searchParams.get("adminProfileId")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const runId = searchParams.get("runId");
    if (runId) {
      const run = getRun(runId);
      if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
      return NextResponse.json({ run });
    }
    return NextResponse.json({ runs: listRuns() });
  } catch (error) {
    console.error("GET /api/admin/research-agent/status error:", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
