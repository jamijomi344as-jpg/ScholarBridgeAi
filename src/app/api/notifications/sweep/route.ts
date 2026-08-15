import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  scholarships,
  savedScholarships,
  applicationTasks,
  notifications,
} from "@/db/schema";
import { eq, and, gte, lt, isNull } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

/**
 * Deadline notification sweep (spec §20, §21).
 *
 * Checks saved scholarships + user milestones for deadlines within the next
 * N days (config: `notification_deadline_window_days`, default 14) and creates
 * in-app notifications. Idempotent: a notification with the same
 * (type, profile_id, link) is only created once per deadline.
 *
 * Called by the cron endpoint or lazily when the app loads.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = body.profileId ? Number(body.profileId) : null;

    // Optional window override (default 14 days).
    const windowDays = Number(body.windowDays || 14);
    const now = new Date();
    const horizon = new Date(now.getTime() + windowDays * 86400000);

    let created = 0;

    // ---------- 1) Saved scholarships with upcoming deadlines ----------
    const savedSch = profileId
      ? await db
          .select()
          .from(savedScholarships)
          .where(eq(savedScholarships.profileId, profileId))
      : [];

    for (const s of savedSch) {
      if (!profileId) continue;
      const [sch] = await db
        .select()
        .from(scholarships)
        .where(eq(scholarships.id, s.scholarshipId));

      if (!sch) continue;
      const deadline = sch.deadlineDate ? new Date(sch.deadlineDate) : null;

      if (deadline && deadline >= now && deadline <= horizon) {
        const link = `/scholarships?id=${sch.id}`;
        // Idempotency: skip if an unread notification for this deadline exists.
        const [existing] = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.profileId, profileId),
              eq(notifications.type, "deadline_approaching"),
              eq(notifications.link, link)
            )
          );
        if (!existing) {
          const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
          await createNotification({
            profileId,
            type: "deadline_approaching",
            title: `Deadline approaching: ${sch.title}`,
            body: `The ${sch.title} scholarship deadline is in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${deadline.toLocaleDateString()}).`,
            link,
          });
          created += 1;
        }
      }
    }

    // ---------- 2) User milestones due soon ----------
    if (profileId) {
      const tasks = await db
        .select()
        .from(applicationTasks)
        .where(
          and(
            eq(applicationTasks.profileId, profileId),
            eq(applicationTasks.isCompleted, false)
          )
        );

      for (const t of tasks) {
        const due = t.dueDate ? new Date(t.dueDate) : null;
        if (due && due >= now && due <= horizon) {
          const link = `/tasks`;
          const [existing] = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.profileId, profileId),
                eq(notifications.type, "milestone_due"),
                eq(notifications.link, link),
                eq(notifications.title, `Milestone due: ${t.title}`)
              )
            );
          if (!existing) {
            const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
            await createNotification({
              profileId,
              type: "milestone_due",
              title: `Milestone due: ${t.title}`,
              body: `Your task "${t.title}" is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${due.toLocaleDateString()}).`,
              link,
            });
            created += 1;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error("POST /api/notifications/sweep error:", error);
    return NextResponse.json({ error: "Notification sweep failed" }, { status: 500 });
  }
}
