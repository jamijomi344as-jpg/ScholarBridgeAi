import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReplies, forumLikes, studentProfiles, forumThreads } from "@/db/schema";
import { eq, and, count, asc, desc } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadIdStr = searchParams.get("threadId");
    if (!threadIdStr) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }
    const threadId = parseInt(threadIdStr, 10);

    const likeCounts = db
      .select({
        targetId: forumLikes.targetId,
        c: count(forumLikes.id).as("reply_like_count"),
      })
      .from(forumLikes)
      .where(eq(forumLikes.targetType, "reply"))
      .groupBy(forumLikes.targetId)
      .as("reply_like_counts");

    const replies = await db
      .select({
        id: forumReplies.id,
        threadId: forumReplies.threadId,
        authorId: forumReplies.authorId,
        parentReplyId: forumReplies.parentReplyId,
        body: forumReplies.body,
        createdAt: forumReplies.createdAt,
        authorName: studentProfiles.name,
        likeCount: likeCounts.c,
      })
      .from(forumReplies)
      .leftJoin(studentProfiles, eq(forumReplies.authorId, studentProfiles.id))
      .leftJoin(likeCounts, eq(likeCounts.targetId, forumReplies.id))
      .where(eq(forumReplies.threadId, threadId))
      .orderBy(asc(forumReplies.createdAt));

    return NextResponse.json({ replies });
  } catch (error) {
    console.error("GET /api/forum/replies error:", error);
    return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { threadId, authorId, body: replyBody, parentReplyId } = body;

    if (!threadId || !authorId || !replyBody) {
      return NextResponse.json({ error: "threadId, authorId and body are required" }, { status: 400 });
    }

    // Prevent posting to a locked thread.
    const [thread] = await db.select().from(forumThreads).where(eq(forumThreads.id, Number(threadId)));
    if (thread?.isLocked) {
      return NextResponse.json({ error: "This thread is locked" }, { status: 403 });
    }

    const [reply] = await db
      .insert(forumReplies)
      .values({
        threadId: Number(threadId),
        authorId: Number(authorId),
        parentReplyId: parentReplyId ? Number(parentReplyId) : null,
        body: replyBody,
      })
      .returning();

    // Bump the thread's updatedAt so "Latest" sorting reflects new activity.
    await db.update(forumThreads).set({ updatedAt: new Date() }).where(eq(forumThreads.id, Number(threadId)));

    const [author] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, Number(authorId)));
    try {
      await awardPoints(reply.authorId, 2, "reply_created", reply.id);
    } catch (err) {
      console.error("Failed to award reply points:", err);
    }
    return NextResponse.json({ reply: { ...reply, authorName: author?.name || "Student" } });
  } catch (error) {
    console.error("POST /api/forum/replies error:", error);
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}
