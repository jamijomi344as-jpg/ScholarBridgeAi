import { eq, and, desc, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { referrals, studentProfiles } from "@/db/schema";
import { generateReferralCode, awardPoints, computeProfileCompleteness } from "@/lib/gamification";
import { getConfigNumber } from "@/lib/config";

export const REFERRAL_LINK_BASE =
  process.env.NEXT_PUBLIC_APP_URL || "https://scholarbridge-qhvw.onrender.com";
export const REFERRAL_PREMIUM_MULTIPLE = 5;
export const REFERRAL_PREMIUM_DAYS = 30;

/**
 * Each referrer owns a single "anchor" referral row (referredProfileId = null)
 * that holds their unique referral code. Real referrals add new rows.
 */
export async function getOrCreateReferralAnchor(profileId: number) {
  const [existing] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerProfileId, profileId),
        isNull(referrals.referredProfileId)
      )
    );

  if (existing) return existing;

  // Retry on the rare code collision.
  let code = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    if (clash.length === 0) break;
    code = generateReferralCode();
  }

  const [anchor] = await db
    .insert(referrals)
    .values({
      referrerProfileId: profileId,
      referredProfileId: null,
      referralCode: code,
      status: "pending",
      pointsAwarded: 0,
    })
    .returning();
  return anchor;
}

/** Fetch the referral overview for a profile (code, link, their referrals, incoming). */
export async function getReferralOverview(profileId: number) {
  const anchor = await getOrCreateReferralAnchor(profileId);
  const base = process.env.NEXT_PUBLIC_APP_URL || "";

  const outgoing = await db
    .select({
      id: referrals.id,
      referralCode: referrals.referralCode,
      status: referrals.status,
      pointsAwarded: referrals.pointsAwarded,
      createdAt: referrals.createdAt,
      referredName: studentProfiles.name,
    })
    .from(referrals)
    .leftJoin(studentProfiles, eq(referrals.referredProfileId, studentProfiles.id))
    .where(
      and(
        eq(referrals.referrerProfileId, profileId),
        isNotNull(referrals.referredProfileId)
      )
    )
    .orderBy(desc(referrals.createdAt));

  const [incoming] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredProfileId, profileId))
    .limit(1);

  return {
    code: anchor.referralCode,
    link: `${base}/?ref=${anchor.referralCode}`,
    outgoing,
    incoming: incoming ?? null,
  };
}

/**
 * Apply a referral code to a profile. Creates a pending referral linking the
 * applicant as the referred user. Returns the referral or null on failure.
 */
export async function applyReferralCode(profileId: number, code: string) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { error: "EMPTY" };

  const [anchor] = await db.select().from(referrals).where(eq(referrals.referralCode, normalized));
  if (!anchor || anchor.referredProfileId !== null) {
    return { error: "INVALID" };
  }
  if (anchor.referrerProfileId === profileId) {
    return { error: "SELF" };
  }

  // A profile can only be referred once.
  const already = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredProfileId, profileId));
  if (already.length > 0) {
    return { error: "EXISTS" };
  }

  const [referral] = await db
    .insert(referrals)
    .values({
      referrerProfileId: anchor.referrerProfileId,
      referredProfileId: profileId,
      referralCode: normalized,
      status: "pending",
      pointsAwarded: 0,
    })
    .returning();

  return { referral };
}

/**
 * Called after a referred user reaches profile completion. Marks their pending
 * referral as completed and awards points to both parties (idempotent).
 */
export async function completeReferralIfDue(profileId: number) {
  const [ref] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredProfileId, profileId),
        eq(referrals.status, "pending")
      )
    );
  if (!ref) return null;

  const [referred] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
  if (!referred) return null;

  if (computeProfileCompleteness(referred) < 90) return null;

  await db
    .update(referrals)
    .set({ status: "completed", pointsAwarded: 150 })
    .where(eq(referrals.id, ref.id));

  await awardPoints(ref.referrerProfileId, 100, "referral_referrer", ref.id);
  await awardPoints(profileId, 50, "referral_referred", ref.id);

  return { ...ref, status: "completed" };
}

// ---------------------------------------------------------------------------
// Referral system v2 — columns on student_profiles
// ---------------------------------------------------------------------------

/**
 * Ensure a profile has a unique referral code (8-char, e.g. "HUSH2026X").
 * Creates one if missing. Used at registration and as a backfill.
 */
export async function ensureReferralCode(profileId: number) {
  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId));
  if (!profile) return null;
  if (profile.referralCode) return profile;

  let code = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.referralCode, code));
    if (clash.length === 0) break;
    code = generateReferralCode();
  }

  const [updated] = await db
    .update(studentProfiles)
    .set({ referralCode: code })
    .where(eq(studentProfiles.id, profileId))
    .returning();
  return updated ?? null;
}

/**
 * Server-side application of a ?ref= code to a newly registered profile.
 * Sets referred_by to the referrer's id. Guards:
 *  - empty/invalid code   → { error: "INVALID" }
 *  - self-referral        → { error: "SELF" }  (never writes referred_by)
 *  - already referred     → { error: "EXISTS" } (only first referral counts)
 */
export async function applyReferralCodeToProfile(profileId: number, code: string) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { error: "EMPTY" };

  const [target] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.referralCode, normalized));
  if (!target) return { error: "INVALID" };

  const [newProfile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId));
  if (!newProfile) return { error: "INVALID" };

  // Self-referral is not allowed — and must never be written.
  if (target.id === profileId) return { error: "SELF" };
  if (newProfile.referredBy != null) return { error: "EXISTS" };

  await db
    .update(studentProfiles)
    .set({ referredBy: target.id })
    .where(eq(studentProfiles.id, profileId));

  return { ok: true, referrerId: target.id };
}

/**
 * Grant a referrer +1 referral point and, when referral_points reaches a
 * multiple of 5 (5, 10, 15...), grant/stack 30 days of premium.
 * Everything runs inside ONE atomic transaction — safe against concurrent
 * activation calls. Only called server-side.
 */
export async function grantReferralReward(referrerId: number) {
  return db.transaction(async (tx) => {
    const [referrer] = await tx
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, referrerId));
    if (!referrer) return null;

    const newPoints = (referrer.referralPoints ?? 0) + 1;

    const now = new Date();
    let isPremium = referrer.isPremium ?? false;
    let premiumUntil = referrer.premiumUntil ?? null;

    if (newPoints % REFERRAL_PREMIUM_MULTIPLE === 0) {
      const base = premiumUntil && new Date(premiumUntil).getTime() > now.getTime()
        ? new Date(premiumUntil)
        : now;
      // Config-driven premium days (spec §3).
      const rewardDays = await getConfigNumber("referral_premium_days", REFERRAL_PREMIUM_DAYS);
      premiumUntil = new Date(base.getTime() + rewardDays * 86400000);
      isPremium = true;
    }

    const [updated] = await tx
      .update(studentProfiles)
      .set({
        referralPoints: newPoints,
        isPremium,
        premiumUntil,
        updatedAt: now,
      })
      .where(eq(studentProfiles.id, referrerId))
      .returning();

    return {
      referrer: updated,
      points: newPoints,
      premiumGranted: newPoints % REFERRAL_PREMIUM_MULTIPLE === 0,
      premiumUntil,
    };
  });
}

export interface ReferralRewardResult {
  ok: boolean;
  reason?: string;
  referrer?: typeof studentProfiles.$inferSelect;
  points?: number;
  premiumGranted?: boolean;
  premiumUntil?: Date | null;
}

/**
 * Called server-side when a referred user becomes "active" (completes
 * onboarding / fills their profile). Awards the referrer +1 point exactly
 * once per referred profile (referral_rewarded flag makes it idempotent).
 */
export async function activateReferralReward(profileId: number): Promise<ReferralRewardResult> {
  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId));
  if (!profile) return { ok: false, reason: "NOT_FOUND" };
  if (profile.referredBy == null) return { ok: false, reason: "NO_REFERRER" };
  if (profile.referralRewarded) return { ok: false, reason: "ALREADY_REWARDED" };

  const [result] = await db.transaction(async (tx) => {
    // Lock the referred profile row inside the transaction to avoid double awards.
    const [locked] = await tx
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));
    if (!locked || locked.referralRewarded || locked.referredBy == null) return [null];

    await tx
      .update(studentProfiles)
      .set({ referralRewarded: true, updatedAt: new Date() })
      .where(eq(studentProfiles.id, profileId));

    const reward = await grantReferralReward(locked.referredBy);
    return [reward];
  });

  if (!result) return { ok: false, reason: "ALREADY_REWARDED" };

  return { ok: true, ...result };
}

/** Current premium state coming from the referral columns. */
export function referralPremiumActive(profile: {
  isPremium?: boolean | null;
  premiumUntil?: Date | string | null;
}): boolean {
  if (!profile.isPremium) return false;
  if (!profile.premiumUntil) return false;
  return new Date(profile.premiumUntil).getTime() > Date.now();
}

/**
 * Full referral status for the UI: code, shareable link, points, premium
 * state and the list of referred users (name/email + active flag).
 */
export async function getReferralStatus(profileId: number) {
  const profile = await ensureReferralCode(profileId);
  if (!profile) return null;

  const referredUsers = await db
    .select({
      id: studentProfiles.id,
      name: studentProfiles.name,
      email: studentProfiles.email,
      referralRewarded: studentProfiles.referralRewarded,
      onboardingCompleted: studentProfiles.onboardingCompleted,
      createdAt: studentProfiles.createdAt,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.referredBy, profileId))
    .orderBy(desc(studentProfiles.createdAt));

  const premiumActive = referralPremiumActive(profile);
  const nextMilestone =
    Math.floor(((profile.referralPoints ?? 0) / REFERRAL_PREMIUM_MULTIPLE)) * REFERRAL_PREMIUM_MULTIPLE +
    REFERRAL_PREMIUM_MULTIPLE;

  return {
    code: profile.referralCode,
    link: `${REFERRAL_LINK_BASE}/?ref=${profile.referralCode}`,
    referralPoints: profile.referralPoints ?? 0,
    nextMilestone,
    isPremium: premiumActive,
    premiumUntil: premiumActive ? profile.premiumUntil : null,
    referredBy: profile.referredBy,
    referredUsers: referredUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.referralRewarded || u.onboardingCompleted,
    })),
  };
}
