import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumCategories, forumThreads } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { seedForum } from "@/db/seed";

export async function GET() {
  try {
    await seedForum();
    const rows = await db
      .select({
        id: forumCategories.id,
        name: forumCategories.name,
        slug: forumCategories.slug,
        description: forumCategories.description,
        sortOrder: forumCategories.sortOrder,
        createdAt: forumCategories.createdAt,
        threadCount: sql<number>`count(${forumThreads.id})::int`,
      })
      .from(forumCategories)
      .leftJoin(forumThreads, eq(forumThreads.categoryId, forumCategories.id))
      .groupBy(forumCategories.id)
      .orderBy(forumCategories.sortOrder);

    return NextResponse.json({ categories: rows });
  } catch (error) {
    console.error("GET /api/forum/categories error:", error);
    return NextResponse.json({ error: "Failed to fetch forum categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, description, sortOrder } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    const [category] = await db
      .insert(forumCategories)
      .values({
        name,
        slug,
        description: description || "",
        sortOrder: sortOrder ? Number(sortOrder) : 0,
      })
      .returning();

    return NextResponse.json({ category });
  } catch (error) {
    console.error("POST /api/forum/categories error:", error);
    return NextResponse.json({ error: "Failed to create forum category" }, { status: 500 });
  }
}
