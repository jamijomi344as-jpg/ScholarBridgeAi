import { eq, and, desc, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { referrals, studentProfiles } from "@/db/schema";
import { generateReferralCode, awardPoints, computeProfileCompleteness } from "@/lib/gamification";

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
