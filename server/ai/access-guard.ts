import { storage } from "../storage";
import type { Parent } from "@shared/schema";

export type AiPlan = "free" | "trial" | "gold";

export interface AiAccessResult {
  allowed: boolean;
  plan: AiPlan;
  trialDaysRemaining?: number;
  trialExpired?: boolean;
  membershipAdvice?: string;
  membershipAdviceAudio?: boolean;
  dailyUsed?: number;
  dailyLimit?: number;
  dailyRemaining?: number;
}

const TRIAL_DURATION_DAYS = 14;
const TRIAL_DAILY_LIMIT = 20;
const GOLD_DAILY_LIMIT = 999;

const MEMBERSHIP_ADVICE_SOMALI = `Waalid qaaliga ah, waad ku mahadsan tahay isticmaalka adeeggan mudadii tijaabada ahayd. Si aad u sii wadato caawinta ku saabsan tarbiyadda ubadkaaga iyo laylisyada dugsiga, waxaan kugula talinayaa inaad noqoto Xubin Dahabi ah.

Xubinimada Dahabiga ah waxay ku siinaysaa adeeggan oo dhan sanad dhan, adigoo bixinaya $114 kaliya, taas oo ka faa'iido badan taageerada joogtada ah ee aad heli doonto.

💛 Noqo Xubin Dahabi ah maanta!`;

export async function checkAiAccess(parentId: string): Promise<AiAccessResult> {
  const parent = await storage.getParent(parentId);
  if (!parent) {
    return { allowed: false, plan: "free" };
  }

  const plan = (parent.aiPlan || "free") as AiPlan;
  const now = new Date();

  if (plan === "gold") {
    if (parent.aiGoldExpiresAt && new Date(parent.aiGoldExpiresAt) < now) {
      await storage.updateParent(parentId, { aiPlan: "free" });
      return {
        allowed: false,
        plan: "free",
        trialExpired: true,
        membershipAdvice: MEMBERSHIP_ADVICE_SOMALI,
        membershipAdviceAudio: true,
      };
    }
    const today = now.toISOString().split('T')[0];
    const hwUsage = await storage.getHomeworkUsageForDate(parentId, today);
    const tarbiyaUsage = await storage.getParentingUsageForDate(parentId, today);
    const totalUsed = (hwUsage?.questionsAsked || 0) + (tarbiyaUsage?.questionsAsked || 0);

    return {
      allowed: true,
      plan: "gold",
      dailyUsed: totalUsed,
      dailyLimit: GOLD_DAILY_LIMIT,
      dailyRemaining: Math.max(0, GOLD_DAILY_LIMIT - totalUsed),
    };
  }

  if (plan === "trial") {
    if (parent.aiTrialEndsAt && new Date(parent.aiTrialEndsAt) < now) {
      return {
        allowed: false,
        plan: "trial",
        trialExpired: true,
        trialDaysRemaining: 0,
        membershipAdvice: MEMBERSHIP_ADVICE_SOMALI,
        membershipAdviceAudio: true,
      };
    }

    const trialEnd = parent.aiTrialEndsAt ? new Date(parent.aiTrialEndsAt) : now;
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const today = now.toISOString().split('T')[0];
    const hwUsage = await storage.getHomeworkUsageForDate(parentId, today);
    const tarbiyaUsage = await storage.getParentingUsageForDate(parentId, today);
    const totalUsed = (hwUsage?.questionsAsked || 0) + (tarbiyaUsage?.questionsAsked || 0);

    if (totalUsed >= TRIAL_DAILY_LIMIT) {
      return {
        allowed: false,
        plan: "trial",
        trialDaysRemaining: daysRemaining,
        dailyUsed: totalUsed,
        dailyLimit: TRIAL_DAILY_LIMIT,
        dailyRemaining: 0,
      };
    }

    return {
      allowed: true,
      plan: "trial",
      trialDaysRemaining: daysRemaining,
      dailyUsed: totalUsed,
      dailyLimit: TRIAL_DAILY_LIMIT,
      dailyRemaining: Math.max(0, TRIAL_DAILY_LIMIT - totalUsed),
    };
  }

  return {
    allowed: false,
    plan: "free",
  };
}

export async function startTrial(parentId: string): Promise<AiAccessResult> {
  const now = new Date();
  const trialEnd = new Date("2026-03-31T23:59:59Z");

  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  await storage.updateParent(parentId, {
    aiPlan: "trial",
    aiTrialStartedAt: now,
    aiTrialEndsAt: trialEnd,
  });

  return {
    allowed: true,
    plan: "trial",
    trialDaysRemaining: daysRemaining,
    dailyUsed: 0,
    dailyLimit: TRIAL_DAILY_LIMIT,
    dailyRemaining: TRIAL_DAILY_LIMIT,
  };
}

export async function activateGold(parentId: string): Promise<void> {
  const now = new Date();
  const goldExpires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  await storage.updateParent(parentId, {
    aiPlan: "gold",
    aiGoldExpiresAt: goldExpires,
  });
}

export async function checkOrStartTrial(parentId: string): Promise<AiAccessResult> {
  const access = await checkAiAccess(parentId);

  if (access.plan === "free" && !access.trialExpired) {
    return await startTrial(parentId);
  }

  return access;
}

export { TRIAL_DAILY_LIMIT, GOLD_DAILY_LIMIT, MEMBERSHIP_ADVICE_SOMALI };
