import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getAuditLogs } from "@/lib/audit";

/** GET: audit/change history (spec §10, §11). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (!(await isAdmin(searchParams.get("adminProfileId")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const logs = await getAuditLogs({
      entityType: searchParams.get("entityType") || undefined,
      entityId: searchParams.get("entityId") ? Number(searchParams.get("entityId")) : undefined,
      actor: searchParams.get("actor") || undefined,
      limit: Number(searchParams.get("limit") || 100),
      offset: Number(searchParams.get("offset") || 0),
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/audit error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
