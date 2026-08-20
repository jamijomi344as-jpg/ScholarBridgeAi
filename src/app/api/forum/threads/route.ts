import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumThreads, forumReplies, forumLikes, studentProfiles, forumCategories } from "@/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { notifyAdmins } from "@/lib/notifications";

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryIdStr = searchParams.get("categoryId");
    const authorIdStr = searchParams.get("authorId");
    const sort = searchParams.get("sort") || "latest"; // latest | replies | likes
    const pageStr = searchParams.get("page") || "1";
    const page = Math.max(1, parseInt(pageStr, 10));

    const filters = [];
    if (categoryIdStr && categoryIdStr !== "all") {
      filters.push(eq(forumThreads.categoryId, parseInt(categoryIdStr, 10)));
    }
    if (authorIdStr) {
      filters.push(eq(forumThreads.authorId, parseInt(authorIdStr, 10)));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const replyCounts = db
      .select({
        threadId: forumReplies.threadId,
        c: count(forumReplies.id).as("reply_count"),
      })
      .from(forumReplies)
      .groupBy(forumReplies.threadId)
      .as("reply_counts");

    const likeCounts = db
      .select({
        targetId: forumLikes.targetId,
        c: count(forumLikes.id).as("like_count"),
      })
      .from(forumLikes)
      .where(eq(forumLikes.targetType, "thread"))
      .groupBy(forumLikes.targetId)
      .as("like_counts");

    const totalRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(forumThreads)
      .where(where);

    const total = totalRows[0]?.c ?? 0;

    let baseQuery = db
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
        categorySlug: forumCategories.slug,
        replyCount: replyCounts.c,
        likeCount: likeCounts.c,
      })
      .from(forumThreads)
      .leftJoin(studentProfiles, eq(forumThreads.authorId, studentProfiles.id))
      .leftJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
      .leftJoin(replyCounts, eq(replyCounts.threadId, forumThreads.id))
      .leftJoin(likeCounts, eq(likeCounts.targetId, forumThreads.id))
      .where(where);

    // Pinned threads always sort to the top.
    let ordered;
    if (sort === "replies") {
      ordered = baseQuery.orderBy(desc(forumThreads.isPinned), desc(replyCounts.c), desc(forumThreads.createdAt));
    } else if (sort === "likes") {
      ordered = baseQuery.orderBy(desc(forumThreads.isPinned), desc(likeCounts.c), desc(forumThreads.createdAt));
    } else {
      ordered = baseQuery.orderBy(desc(forumThreads.isPinned), desc(forumThreads.createdAt));
    }

    const threads = await ordered
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return NextResponse.json({
      threads,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("GET /api/forum/threads error:", error);
    return NextResponse.json({ error: "Failed to fetch forum threads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, authorId, title, body: threadBody } = body;

    if (!categoryId || !authorId || !title || !threadBody) {
      return NextResponse.json({ error: "categoryId, authorId, title and body are required" }, { status: 400 });
    }

    const [thread] = await db
      .insert(forumThreads)
      .values({
        categoryId: Number(categoryId),
        authorId: Number(authorId),
        title,
        body: threadBody,
        isPinned: false,
        isLocked: false,
        viewCount: 0,
      })
      .returning();

    try {
      await awardPoints(thread.authorId, 5, "thread_created", thread.id);
    } catch (err) {
      console.error("Failed to award thread points:", err);
    }

    // Notify admins about the new community thread (site activity).
    try {
      const [author] = await db
        .select({ name: studentProfiles.name })
        .from(studentProfiles)
        .where(eq(studentProfiles.id, thread.authorId));
      await notifyAdmins({
        type: "forum_thread",
        title: "💬 New community thread",
        body: `${author?.name || "A student"} posted: ${String(title).slice(0, 100)}`,
        link: `/forum`,
      });
    } catch (err) {
      console.error("Failed to notify admins about new thread:", err);
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("POST /api/forum/threads error:", error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
