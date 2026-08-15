import { getConfig } from "@/lib/config";

export type Plan = "free" | "premium" | "admin";

export type FeatureKey =
  | "university_basic"
  | "university_advanced"
  | "scholarship_basic"
  | "scholarship_advanced"
  | "ai_general"
  | "ai_essay"
  | "ai_advanced"
  | "roadmap"
  | "forum"
  | "courses"
  | "deadline_center"
  | "documents"
  | "notifications_advanced";

/**
 * Centralized entitlements (spec §17). Feature → minimum plan mapping is
 * configurable via app_config keys (`feature_<name> = free|premium|admin`),
 * so the admin controls which plan owns which feature without code changes.
 */

const DEFAULT_FEATURE_PLAN: Record<FeatureKey, Plan> = {
  university_basic: "free",
  university_advanced: "premium",
  scholarship_basic: "free",
  scholarship_advanced: "premium",
  ai_general: "free",
  ai_essay: "premium",
  ai_advanced: "premium",
  roadmap: "premium",
  forum: "premium",
  courses: "premium",
  deadline_center: "premium",
  documents: "premium",
  notifications_advanced: "premium",
};

const PLAN_LEVEL: Record<Plan, number> = { free: 0, premium: 1, admin: 2 };

export function profilePlan(profile: {
  isAdmin?: boolean | null;
  isPremium?: boolean | null;
  premiumUntil?: string | Date | null;
}): Plan {
  if (profile.isAdmin) return "admin";
  if (profile.isPremium) {
    if (profile.premiumUntil) {
      const until = profile.premiumUntil instanceof Date ? profile.premiumUntil : new Date(profile.premiumUntil);
      if (until.getTime() > Date.now()) return "premium";
      return "free";
    }
    return "premium";
  }
  return "free";
}

/** Config-driven override for a feature's required plan. */
export async function featurePlan(feature: FeatureKey): Promise<Plan> {
  try {
    const raw = await getConfig(`feature_${feature}`);
    if (raw === "free" || raw === "premium" || raw === "admin") return raw;
  } catch {
    // fall through to default
  }
  return DEFAULT_FEATURE_PLAN[feature];
}

/** Does this profile have access to the feature? (server-side check) */
export async function can(profile: { isAdmin?: boolean | null; isPremium?: boolean | null; premiumUntil?: string | Date | null } | null, feature: FeatureKey): Promise<boolean> {
  if (!profile) return false;
  const userPlan = profilePlan(profile);
  if (userPlan === "admin") return true;
  const required = await featurePlan(feature);
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[required];
}

/** Sync check used by PremiumGate (keeps the existing component working). */
export function canSync(
  profile: { isAdmin?: boolean | null; isPremium?: boolean | null; premiumUntil?: string | Date | null } | null,
  feature: FeatureKey
): boolean {
  if (!profile) return false;
  const userPlan = profilePlan(profile);
  if (userPlan === "admin") return true;
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[DEFAULT_FEATURE_PLAN[feature]];
}

export { DEFAULT_FEATURE_PLAN };
