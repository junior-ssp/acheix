export const serviceActivityPolicy = {
  activeDays: 180,
  inactiveDays: 365,
  hiddenDays: 370,
  deleteDays: 370,
  reputationRatingsThreshold: 1,
  reputationServicesThreshold: 1
} as const;

const oneDayMs = 24 * 60 * 60 * 1000;

export type ServiceProfileActivityStatus =
  | "ACTIVE"
  | "NEEDS_CONFIRMATION"
  | "PAUSED"
  | "INACTIVE"
  | "ARCHIVED"
  | "DORMANT"
  | "CLOSED";

export type ServiceProfileActivityInput = {
  status: ServiceProfileActivityStatus;
  last_active_at: string | Date | null;
  updated_at?: string | Date | null;
  total_avaliacoes?: number | null;
  total_servicos?: number | null;
  active?: boolean | null;
};

export function nextServiceConfirmationDue(now = new Date()) {
  return addDays(now, serviceActivityPolicy.activeDays);
}

export function hasServiceReputation(profile: Pick<ServiceProfileActivityInput, "total_avaliacoes" | "total_servicos">) {
  return (
    Number(profile.total_avaliacoes ?? 0) >= serviceActivityPolicy.reputationRatingsThreshold ||
    Number(profile.total_servicos ?? 0) >= serviceActivityPolicy.reputationServicesThreshold
  );
}

export function daysSinceServiceActivity(profile: Pick<ServiceProfileActivityInput, "last_active_at">, now = new Date()) {
  const lastActiveAt = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
  if (!Number.isFinite(lastActiveAt) || lastActiveAt <= 0) return Infinity;
  return Math.floor((now.getTime() - lastActiveAt) / oneDayMs);
}

export function daysSinceServiceProfileUpdate(profile: Pick<ServiceProfileActivityInput, "updated_at">, now = new Date()) {
  const updatedAt = profile.updated_at ? new Date(profile.updated_at).getTime() : 0;
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return Infinity;
  return Math.floor((now.getTime() - updatedAt) / oneDayMs);
}

export function classifyServiceProfileActivity(profile: ServiceProfileActivityInput, now = new Date()) {
  if (profile.status === "PAUSED" || profile.status === "CLOSED") return profile.status;

  const inactiveForDays = daysSinceServiceActivity(profile, now);

  if (inactiveForDays >= serviceActivityPolicy.hiddenDays) return hasServiceReputation(profile) ? "DORMANT" : "ARCHIVED";
  if (inactiveForDays >= serviceActivityPolicy.inactiveDays) return "INACTIVE";
  if (inactiveForDays >= serviceActivityPolicy.activeDays) return "INACTIVE";
  return "ACTIVE";
}

export function canDeleteServiceProfile(input: ServiceProfileActivityInput & { hasMessages?: boolean }, now = new Date()) {
  return (
    daysSinceServiceActivity(input, now) >= serviceActivityPolicy.deleteDays &&
    daysSinceServiceProfileUpdate(input, now) >= serviceActivityPolicy.deleteDays &&
    !hasServiceReputation(input) &&
    !input.hasMessages
  );
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * oneDayMs);
}
