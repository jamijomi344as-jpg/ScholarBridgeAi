import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReplies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const replyId = parseInt(id, 10);
    await db.delete(forumReplies).where(eq(forumReplies.id, replyId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/forum/replies/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
  }
}
