import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumThreads, studentProfiles, forumCategories, forumLikes } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const threadId = parseInt(id, 10);

    // Increment view count.
    await db
      .update(forumThreads)
      .set({ viewCount: sql`${forumThreads.viewCount} + 1` })
      .where(eq(forumThreads.id, threadId));

    const [thread] = await db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        authorId: forumThreads.authorId,
        title: forumThreads.title,
        body: forumThreads.body,
        isPinned: forumThreads.isPinned,
        isLocked: forumThreads.isLocked,
        viewCount: forumThreads.viewCount,
        createdAt: forumThreads.createdAt,
        updatedAt: forumThreads.updatedAt,
        authorName: studentProfiles.name,
        categoryName: forumCategories.name,
      })
      .from(forumThreads)
      .leftJoin(studentProfiles, eq(forumThreads.authorId, studentProfiles.id))
      .leftJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .where(eq(forumThreads.id, threadId));

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const [likeCountRow] = await db
      .select({ c: count(forumLikes.id) })
      .from(forumLikes)
      .where(and(eq(forumLikes.targetType, "thread"), eq(forumLikes.targetId, threadId)));
    const likeCount = likeCountRow?.c ?? 0;

    return NextResponse.json({ thread: { ...thread, likeCount } });
  } catch (error) {
    console.error("GET /api/forum/threads/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const threadId = parseInt(id, 10);
    const body = await req.json();
    const { title, body: threadBody, isPinned, isLocked } = body;

    const [updated] = await db
      .update(forumThreads)
      .set({
        title: title !== undefined ? title : undefined,
        body: threadBody !== undefined ? threadBody : undefined,
        isPinned: isPinned !== undefined ? isPinned : undefined,
        isLocked: isLocked !== undefined ? isLocked : undefined,
        updatedAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json({ thread: updated });
  } catch (error) {
    console.error("PATCH /api/forum/threads/[id] error:", error);
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const threadId = parseInt(id, 10);
    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/forum/threads/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
  }
}
