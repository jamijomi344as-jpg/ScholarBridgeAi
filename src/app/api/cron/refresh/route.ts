import { NextResponse } from "next/server";
import { runRefresh } from "@/lib/refresh";
import { getConfig } from "@/lib/config";

/**
 * Cron endpoint — callable by Render Cron, cron-job.org, or any scheduler
 * (spec §9). Schedule is configurable via `refresh_interval_hours`, but the
 * scheduler itself decides WHEN to call this; the endpoint just runs.
 *
 * Protected by a shared secret: CRON_SECRET env var. If unset, the endpoint
 * refuses to run (avoids an open trigger).
 */
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization") || "";
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      return NextResponse.json(
        { error: "CRON_SECRET not configured — set it to enable scheduled refresh" },
        { status: 503 }
      );
    }

    const scope = (await getConfig("refresh_default_scope")) as "all" | "scholarships" | "universities";
    const result = await runRefresh(scope || "all");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("GET /api/cron/refresh error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
