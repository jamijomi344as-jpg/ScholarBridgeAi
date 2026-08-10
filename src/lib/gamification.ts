import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  userPoints,
  pointsLedger,
  levels,
  badges,
  userBadges,
  referrals,
  certificates,
  studentProfiles,
} from "@/db/schema";

/** Generate a unique-looking referral code (uppercase alphanumeric). */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Ensure a points row exists for a profile. */
export async function ensureUserPoints(profileId: number) {
  const [existing] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.profileId, profileId));

  if (existing) return existing;

  const [created] = await db
    .insert(userPoints)
    .values({ profileId, totalPoints: 0, currentLevel: 1 })
    .returning();
  return created;
}

export async function getTotalPoints(profileId: number): Promise<number> {
  const row = await ensureUserPoints(profileId);
  return row.totalPoints;
}

const DEFAULT_LEVELS: { name: string; minPoints: number; iconUrl: string }[] = [
  { name: "Explorer", minPoints: 0, iconUrl: "🌱" },
  { name: "Scholar", minPoints: 100, iconUrl: "🎓" },
  { name: "Achiever", minPoints: 250, iconUrl: "🏆" },
  { name: "Ambassador", minPoints: 500, iconUrl: "🌟" },
];

/** Fetch levels ordered by minPoints ascending (seeding defaults if empty). */
export async function getLevels() {
  const existing = await db.select().from(levels).limit(1);
  if (existing.length === 0) {
    await db.insert(levels).values(DEFAULT_LEVELS);
  }
  return db.select().from(levels).orderBy(levels.minPoints);
}

/** Compute the current level name/object from a point total. */
export function computeLevel(totalPoints: number, levelRows: typeof levels.$inferSelect[]): typeof levels.$inferSelect {
  let current = levelRows[0];
  for (const lvl of levelRows) {
    if (totalPoints >= lvl.minPoints) current = lvl;
  }
  return current ?? levelRows[0];
}

/** 0-100 profile completeness percentage. */
export function computeProfileCompleteness(profile: typeof studentProfiles.$inferSelect): number {
  const checks = [
    !!profile.name,
    !!profile.email,
    !!profile.targetMajor,
    !!profile.degreeLevel,
    profile.gpa > 0,
    profile.gpaScale > 0,
    profile.ieltsScore != null,
    profile.toeflScore != null,
    profile.satScore != null,
    profile.greScore != null,
    profile.budgetAnnualUsd > 0,
    !!profile.extracurriculars,
    profile.workExperienceYears != null,
    profile.researchPublications != null,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

interface AwardResult {
  points: number;
  newTotal: number;
  level: typeof levels.$inferSelect | null;
  newlyAwardedBadges: (typeof badges.$inferSelect)[];
}

/**
 * Award points to a profile: appends a ledger entry, updates the running total,
 * recomputes the level, and auto-grants any badges whose criteria are now met.
 * Idempotent when a relatedEntityId is provided (skips duplicate grants).
 */
export async function awardPoints(
  profileId: number,
  points: number,
  reason: string,
  relatedEntityId?: number | null
): Promise<AwardResult> {
  if (!points || points <= 0) {
    throw new Error("points must be a positive integer");
  }

  // Idempotency: skip if this exact grant already exists in the ledger.
  if (relatedEntityId != null) {
    const dup = await db
      .select()
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.profileId, profileId),
          eq(pointsLedger.reason, reason),
          eq(pointsLedger.relatedEntityId, relatedEntityId)
        )
      );
    if (dup.length > 0) {
      const row = await ensureUserPoints(profileId);
      const levelRows = await getLevels();
      return {
        points,
        newTotal: row.totalPoints,
        level: computeLevel(row.totalPoints, levelRows),
        newlyAwardedBadges: [],
      };
    }
  }

  await db.insert(pointsLedger).values({
    profileId,
    points,
    reason,
    relatedEntityId: relatedEntityId ?? null,
  });

  const row = await ensureUserPoints(profileId);
  const newTotal = row.totalPoints + points;
  const levelRows = await getLevels();
  const currentLevel = computeLevel(newTotal, levelRows);

  await db
    .update(userPoints)
    .set({ totalPoints: newTotal, currentLevel: currentLevel.id, updatedAt: new Date() })
    .where(eq(userPoints.profileId, profileId));

  const newlyAwardedBadges = await grantBadges(profileId);

  return {
    points,
    newTotal,
    level: currentLevel,
    newlyAwardedBadges,
  };
}

/** Evaluate a single badge's criteria for a profile. */
export async function evaluateBadge(
  profile: typeof studentProfiles.$inferSelect,
  badge: typeof badges.$inferSelect
): Promise<boolean> {
  const criteria = badge.criteria.trim();

  if (criteria.startsWith("points:")) {
    const min = parseInt(criteria.split(":")[1], 10);
    const row = await ensureUserPoints(profile.id);
    return row.totalPoints >= min;
  }

  if (criteria.startsWith("referral:")) {
    const min = parseInt(criteria.split(":")[1], 10) || 1;
    const [count] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerProfileId, profile.id),
          eq(referrals.status, "completed")
        )
      );
    return (count?.c ?? 0) >= min;
  }

  if (criteria.startsWith("course:")) {
    const min = parseInt(criteria.split(":")[1], 10) || 1;
    const [count] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(certificates)
      .where(eq(certificates.profileId, profile.id));
    return (count?.c ?? 0) >= min;
  }

  if (criteria === "profile:complete") {
    return computeProfileCompleteness(profile) >= 90;
  }

  return false;
}

/** Auto-grant any badges whose criteria are now satisfied. Returns newly awarded. */
export async function grantBadges(profileId: number): Promise<(typeof badges.$inferSelect)[]> {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
  if (!profile) return [];

  const allBadges = await db.select().from(badges);
  const ownedRows = await db.select().from(userBadges).where(eq(userBadges.profileId, profileId));
  const ownedIds = new Set(ownedRows.map((r) => r.badgeId));

  const toGrant: (typeof badges.$inferSelect)[] = [];
  for (const badge of allBadges) {
    if (ownedIds.has(badge.id)) continue;
    if (await evaluateBadge(profile, badge)) {
      toGrant.push(badge);
    }
  }

  if (toGrant.length > 0) {
    await db.insert(userBadges).values(
      toGrant.map((b) => ({ profileId, badgeId: b.id }))
    );
  }

  return toGrant;
}

/** Return the full gamification snapshot for a profile. */
export async function getGamification(profileId: number) {
  const row = await ensureUserPoints(profileId);
  const levelRows = await getLevels();
  const level = computeLevel(row.totalPoints, levelRows);
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));

  const badgeRows = await db
    .select({
      badge: badges,
      awardedAt: userBadges.awardedAt,
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.profileId, profileId))
    .orderBy(desc(userBadges.awardedAt));

  const ledger = await db
    .select()
    .from(pointsLedger)
    .where(eq(pointsLedger.profileId, profileId))
    .orderBy(desc(pointsLedger.createdAt))
    .limit(50);

  // Next level target for the progress bar.
  let nextLevel = null;
  let pointsIntoLevel = row.totalPoints;
  let pointsForLevel = level.minPoints;
  for (const lvl of levelRows) {
    if (lvl.minPoints > row.totalPoints) {
      nextLevel = lvl;
      pointsIntoLevel = row.totalPoints - level.minPoints;
      pointsForLevel = lvl.minPoints - level.minPoints;
      break;
    }
  }

  const completeness = profile ? computeProfileCompleteness(profile) : 0;

  return {
    totalPoints: row.totalPoints,
    level,
    nextLevel,
    pointsIntoLevel,
    pointsForLevel,
    badges: badgeRows.map((b) => ({ ...b.badge, awardedAt: b.awardedAt })),
    ledger,
    profileCompleteness: completeness,
  };
}

/** Fetch the leaderboard (top profiles by points). */
export async function getLeaderboard(limit = 20) {
  const rows = await db
    .select({
      profileId: userPoints.profileId,
      totalPoints: userPoints.totalPoints,
      levelId: userPoints.currentLevel,
      name: studentProfiles.name,
      email: studentProfiles.email,
      targetMajor: studentProfiles.targetMajor,
      levelName: levels.name,
      levelIcon: levels.iconUrl,
    })
    .from(userPoints)
    .innerJoin(studentProfiles, eq(userPoints.profileId, studentProfiles.id))
    .leftJoin(levels, eq(userPoints.currentLevel, levels.id))
    .orderBy(desc(userPoints.totalPoints))
    .limit(limit);

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}
