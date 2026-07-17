export type ListingTopRefreshPlanCode = "FREE" | "PRODUCT_MINI" | "PRODUCT_START" | "PRODUCT_BASIC" | "BRONZE" | "SILVER" | "GOLD" | "X6" | "X12";

export const topRefreshBoostHours = 8;
export const professionalTopRefreshOwnerCooldownHours = 6;
export const topRefreshSearchBonus = 6;

const topRefreshIntervalDaysByPlan: Record<ListingTopRefreshPlanCode, number> = {
  FREE: 7,
  PRODUCT_MINI: 3,
  PRODUCT_START: 3,
  PRODUCT_BASIC: 3,
  BRONZE: 5,
  SILVER: 3,
  GOLD: 2,
  X6: 1,
  X12: 1
};

const topRefreshLabelsByPlan: Record<ListingTopRefreshPlanCode, string> = {
  FREE: "Volta ao topo a cada 7 dias",
  PRODUCT_MINI: "Volta ao topo a cada 3 dias",
  PRODUCT_START: "Volta ao topo a cada 3 dias",
  PRODUCT_BASIC: "Volta ao topo a cada 3 dias",
  BRONZE: "Volta ao topo a cada 5 dias",
  SILVER: "Volta ao topo a cada 3 dias",
  GOLD: "Volta ao topo a cada 2 dias",
  X6: "Volta ao topo diariamente, com limites de diversidade",
  X12: "Volta ao topo diariamente, com limites de diversidade"
};

export function isListingTopRefreshPlanCode(value: string | null | undefined): value is ListingTopRefreshPlanCode {
  return value === "FREE" || value === "PRODUCT_MINI" || value === "PRODUCT_START" || value === "PRODUCT_BASIC" || value === "BRONZE" || value === "SILVER" || value === "GOLD" || value === "X6" || value === "X12";
}

export function getTopRefreshIntervalDays(planCode: string | null | undefined) {
  return isListingTopRefreshPlanCode(planCode) ? topRefreshIntervalDaysByPlan[planCode] : topRefreshIntervalDaysByPlan.FREE;
}

export function getTopRefreshBenefitLabel(planCode: string | null | undefined) {
  return isListingTopRefreshPlanCode(planCode) ? topRefreshLabelsByPlan[planCode] : topRefreshLabelsByPlan.FREE;
}

export function nextTopRefreshAt(planCode: string | null | undefined, from = new Date()) {
  return addDays(from, getTopRefreshIntervalDays(planCode));
}

export function topRefreshBoostUntil(from = new Date()) {
  return new Date(from.getTime() + topRefreshBoostHours * 60 * 60 * 1000);
}

export function listingTopRefreshActivationFields(planCode: string | null | undefined, from = new Date()) {
  return {
    lastTopRefreshAt: from.toISOString(),
    topRefreshBoostUntil: topRefreshBoostUntil(from).toISOString(),
    nextTopRefreshAt: nextTopRefreshAt(planCode, from).toISOString()
  };
}

export function shouldApplyTopRefreshBoost(input: { topRefreshBoostUntil?: string | Date | null }, now = new Date()) {
  if (!input.topRefreshBoostUntil) return false;
  const boostUntil = new Date(input.topRefreshBoostUntil).getTime();
  return Number.isFinite(boostUntil) && boostUntil > now.getTime();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}
