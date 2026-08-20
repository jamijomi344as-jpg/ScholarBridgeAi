import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReplies, studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const replyId = parseInt(id, 10);
    const { searchParams } = new URL(req.url);

    // Authenticate the requester.
    const requesterId = Number(searchParams.get("requesterId"));
    if (!Number.isFinite(requesterId) || requesterId <= 0) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const [requester] = await db
      .select({ id: studentProfiles.id, isAdmin: studentProfiles.isAdmin })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, requesterId));
    if (!requester) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only the reply author or an admin may delete the reply.
    const [reply] = await db
      .select({ id: forumReplies.id, authorId: forumReplies.authorId })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId));

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }
    if (reply.authorId !== requester.id && !requester.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: only the reply author or an admin can delete this reply" },
        { status: 403 }
      );
    }

    await db.delete(forumReplies).where(eq(forumReplies.id, replyId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/forum/replies/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
  }
}
