import { db } from "@/db";
import { notifications, notificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Notification helper (spec §20). Creates an in-app notification if the user
 * has not disabled the type. Email/push channels are stubbed — they activate
 * when SMTP/push infrastructure is connected.
 */
export async function createNotification(input: {
  profileId: number;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    // Respect preferences.
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.profileId, input.profileId));

    let enabled = true;
    if (prefs) {
      try {
        const types = JSON.parse(prefs.types || "[]") as string[];
        enabled = prefs.inApp && (types.includes(input.type) || types.length === 0);
      } catch {
        enabled = prefs.inApp;
      }
    }

    if (!enabled) return null;

    const [row] = await db
      .insert(notifications)
      .values({
        profileId: input.profileId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      })
      .returning();
    return row;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

/** Batch-create notifications for multiple profiles. */
export async function notifyMany(
  profileIds: number[],
  input: Omit<Parameters<typeof createNotification>[0], "profileId">
) {
  for (const id of profileIds) {
    await createNotification({ ...input, profileId: id });
  }
}
