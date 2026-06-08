export const recoveryDays = 7;
export const freeListingCooldownDays = 90;

export function getListingDurationDays(input: { plan?: { durationDays: number } | null; planCode?: string }) {
  if (input.plan?.durationDays) return input.plan.durationDays;
  if (input.planCode === "FREE") return 30;
  if (input.planCode === "BRONZE") return 60;
  if (input.planCode === "SILVER") return 90;
  if (input.planCode === "GOLD") return 120;
  if (input.planCode === "X6") return 180;
  if (input.planCode === "X12") return 365;
  return 30;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysUntil(date: Date, now = new Date()) {
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

export function shouldExpireListing(input: { status: string; expiresAt: Date; expiredNotifiedAt?: Date | null }, now = new Date()) {
  return input.status === "ACTIVE" && input.expiresAt.getTime() <= now.getTime() && !input.expiredNotifiedAt;
}

export function shouldDeleteExpiredListing(input: { status: string; expiresAt: Date }, now = new Date()) {
  const recoveryLimit = addDays(input.expiresAt, recoveryDays);
  return input.status === "EXPIRED" && recoveryLimit.getTime() <= now.getTime();
}
