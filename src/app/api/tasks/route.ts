import { NextResponse } from "next/server";
import { db } from "@/db";
import { applicationTasks, universities } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");

    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profileId = parseInt(profileIdStr, 10);
    const tasks = await db
      .select({
        id: applicationTasks.id,
        profileId: applicationTasks.profileId,
        universityId: applicationTasks.universityId,
        title: applicationTasks.title,
        category: applicationTasks.category,
        dueDate: applicationTasks.dueDate,
        isCompleted: applicationTasks.isCompleted,
        priority: applicationTasks.priority,
        createdAt: applicationTasks.createdAt,
        universityName: universities.name,
      })
      .from(applicationTasks)
      .leftJoin(universities, eq(applicationTasks.universityId, universities.id))
      .where(eq(applicationTasks.profileId, profileId));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch application tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, universityId, title, category, dueDate, priority } = body;

    if (!profileId || !title) {
      return NextResponse.json({ error: "profileId and title are required" }, { status: 400 });
    }

    const [newTask] = await db.insert(applicationTasks).values({
      profileId,
      universityId: universityId ? Number(universityId) : null,
      title,
      category: category || "Document Prep",
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      isCompleted: false,
      priority: priority || "Medium",
    }).returning();

    return NextResponse.json({ task: newTask });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, isCompleted, title, dueDate, priority, category } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(applicationTasks)
      .set({
        isCompleted: isCompleted !== undefined ? isCompleted : undefined,
        title: title !== undefined ? title : undefined,
        dueDate: dueDate !== undefined ? dueDate : undefined,
        priority: priority !== undefined ? priority : undefined,
        category: category !== undefined ? category : undefined,
      })
      .where(eq(applicationTasks.id, id))
      .returning();

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("PATCH /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    await db.delete(applicationTasks).where(eq(applicationTasks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
