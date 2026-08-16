/** App modes gated by monthly subscription. */
export type AppMode = "standard" | "techpassport" | "house3d";

export type SubscriptionPlan = {
  id: string;
  /** i18n keys under payment.plans.* */
  nameKey: string;
  descKey: string;
  modes: AppMode[];
  /** Generations included with each monthly payment */
  credits: number;
  /** Amount in minor currency units (e.g. cents): 990 = 9.90 */
  amount: number;
  /** Billing period in days */
  periodDays: number;
};

/** Generations granted with every paid subscription month */
export const PLAN_CREDITS = 100;

/**
 * Monthly plans — differ by modes; each includes +100 generations.
 * Without an active subscription the user keeps only «standard».
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "sub_standard",
    nameKey: "payment.plans.standard.name",
    descKey: "payment.plans.standard.desc",
    modes: ["standard"],
    credits: PLAN_CREDITS,
    amount: 990,
    periodDays: 30,
  },
  {
    id: "sub_plan",
    nameKey: "payment.plans.plan.name",
    descKey: "payment.plans.plan.desc",
    modes: ["standard", "techpassport"],
    credits: PLAN_CREDITS,
    amount: 1990,
    periodDays: 30,
  },
  {
    id: "sub_full",
    nameKey: "payment.plans.full.name",
    descKey: "payment.plans.full.desc",
    modes: ["standard", "techpassport", "house3d"],
    credits: PLAN_CREDITS,
    amount: 2990,
    periodDays: 30,
  },
];

export const FREE_MODES: AppMode[] = ["standard"];

export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}

/** @deprecated use getPlanById */
export function getPackageById(id: string): SubscriptionPlan | undefined {
  return getPlanById(id);
}

/** @deprecated use SUBSCRIPTION_PLANS */
export const CREDIT_PACKAGES = SUBSCRIPTION_PLANS;

export function isSubscriptionActive(
  planId: string | null | undefined,
  expiresAt: string | Date | null | undefined
): boolean {
  if (!planId || !expiresAt) return false;
  const end = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Number.isFinite(end.getTime()) && end.getTime() > Date.now();
}

export function getAllowedModes(
  planId: string | null | undefined,
  expiresAt: string | Date | null | undefined
): AppMode[] {
  if (!isSubscriptionActive(planId, expiresAt)) return [...FREE_MODES];
  const plan = getPlanById(planId!);
  return plan ? [...plan.modes] : [...FREE_MODES];
}

export function canAccessMode(
  mode: AppMode,
  planId: string | null | undefined,
  expiresAt: string | Date | null | undefined
): boolean {
  return getAllowedModes(planId, expiresAt).includes(mode);
}

export function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

export function formatPeriodLabel(locale: string): string {
  return locale === "en" ? "/ month" : "/ мес.";
}


