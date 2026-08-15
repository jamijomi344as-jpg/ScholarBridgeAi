import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getAllConfig, setConfig } from "@/lib/config";

/** GET: list all config (admin). PUT: update a single value. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (!(await isAdmin(searchParams.get("adminProfileId")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const config = await getAllConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("GET /api/admin/config error:", error);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!(await isAdmin(body.adminProfileId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { key, value, description } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    await setConfig(String(key), String(value), description);
    return NextResponse.json({ success: true, key, value: String(value) });
  } catch (error) {
    console.error("PUT /api/admin/config error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
