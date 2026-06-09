export const serviceBillingPolicy = {
  planCode: "SERVICE_FREE",
  launchFreeMonths: 6,
  renewalCycleMonths: 12,
  renewalPriceCents: 990,
  graceDays: 15,
  alertBeforeDays: 3,
  alertAfterDays: 3
} as const;

export type ServiceBillingStatus = "TRIALING" | "ACTIVE" | "GRACE" | "HIDDEN";

export type ServiceBillingInfo = {
  planCode: string;
  launchOffer: boolean;
  renewalPriceCents: number;
  cycleMonths: number;
  trialStartedAt: string;
  currentPeriodStartedAt: string;
  currentPeriodEndsAt: string;
  graceEndsAt: string;
  status: ServiceBillingStatus;
  alertsSent?: Partial<Record<ServiceBillingAlertKey, string>>;
  hiddenAt?: string | null;
  lastPaymentAt?: string | null;
};

export type ServiceBillingAlertKey = "before_due" | "due" | "after_due";

const oneDayMs = 24 * 60 * 60 * 1000;

export function ensureServiceBilling(existing: unknown, now = new Date()): ServiceBillingInfo {
  const parsed = isRecord(existing) ? existing : {};
  const currentPeriodStartedAt = validIso(parsed.currentPeriodStartedAt) ?? validIso(parsed.trialStartedAt) ?? now.toISOString();
  const currentPeriodEndsAt = validIso(parsed.currentPeriodEndsAt) ?? addMonths(new Date(currentPeriodStartedAt), serviceBillingPolicy.launchFreeMonths).toISOString();
  const graceEndsAt = validIso(parsed.graceEndsAt) ?? addDays(new Date(currentPeriodEndsAt), serviceBillingPolicy.graceDays).toISOString();
  const billing: ServiceBillingInfo = {
    planCode: typeof parsed.planCode === "string" ? parsed.planCode : serviceBillingPolicy.planCode,
    launchOffer: typeof parsed.launchOffer === "boolean" ? parsed.launchOffer : true,
    renewalPriceCents: Number.isFinite(Number(parsed.renewalPriceCents)) ? Number(parsed.renewalPriceCents) : serviceBillingPolicy.renewalPriceCents,
    cycleMonths: Number.isFinite(Number(parsed.cycleMonths)) ? Number(parsed.cycleMonths) : serviceBillingPolicy.renewalCycleMonths,
    trialStartedAt: validIso(parsed.trialStartedAt) ?? currentPeriodStartedAt,
    currentPeriodStartedAt,
    currentPeriodEndsAt,
    graceEndsAt,
    status: normalizeBillingStatus(parsed.status),
    alertsSent: isRecord(parsed.alertsSent) ? parsed.alertsSent as ServiceBillingInfo["alertsSent"] : {},
    hiddenAt: validIso(parsed.hiddenAt),
    lastPaymentAt: validIso(parsed.lastPaymentAt)
  };
  return refreshServiceBillingStatus(billing, now);
}

export function refreshServiceBillingStatus(billing: ServiceBillingInfo, now = new Date()): ServiceBillingInfo {
  const periodEndsAt = new Date(billing.currentPeriodEndsAt);
  const graceEndsAt = new Date(billing.graceEndsAt);
  let status: ServiceBillingStatus = billing.status === "ACTIVE" ? "ACTIVE" : "TRIALING";
  if (now.getTime() > periodEndsAt.getTime()) status = "GRACE";
  if (now.getTime() > graceEndsAt.getTime()) status = "HIDDEN";
  return {
    ...billing,
    status,
    hiddenAt: status === "HIDDEN" ? billing.hiddenAt ?? now.toISOString() : billing.hiddenAt ?? null
  };
}

export function activateServiceProBilling(existing: unknown, paidAt = new Date()): ServiceBillingInfo {
  const startsAt = paidAt.toISOString();
  const endsAt = addMonths(paidAt, serviceBillingPolicy.renewalCycleMonths).toISOString();
  return {
    ...ensureServiceBilling(existing, paidAt),
    planCode: "SERVICE_PRO",
    launchOffer: false,
    renewalPriceCents: serviceBillingPolicy.renewalPriceCents,
    cycleMonths: serviceBillingPolicy.renewalCycleMonths,
    currentPeriodStartedAt: startsAt,
    currentPeriodEndsAt: endsAt,
    graceEndsAt: addDays(new Date(endsAt), serviceBillingPolicy.graceDays).toISOString(),
    status: "ACTIVE",
    alertsSent: {},
    hiddenAt: null,
    lastPaymentAt: startsAt
  };
}

export function isServiceVisibleByBilling(complement: string | null | undefined, now = new Date()) {
  const billing = serviceBillingFromComplement(complement, now);
  return billing.status !== "HIDDEN";
}

export function serviceBillingFromComplement(complement: string | null | undefined, now = new Date()) {
  if (!complement) return ensureServiceBilling(null, now);
  try {
    const parsed = JSON.parse(complement);
    return ensureServiceBilling(parsed?.serviceBilling, now);
  } catch {
    return ensureServiceBilling(null, now);
  }
}

export function serviceBillingSummary(complement: string | null | undefined, now = new Date()) {
  const billing = serviceBillingFromComplement(complement, now);
  const dueAt = new Date(billing.currentPeriodEndsAt);
  const graceEndsAt = new Date(billing.graceEndsAt);
  const daysUntilDue = Math.ceil((dueAt.getTime() - now.getTime()) / oneDayMs);
  const daysUntilHidden = Math.ceil((graceEndsAt.getTime() - now.getTime()) / oneDayMs);
  return { billing, daysUntilDue, daysUntilHidden };
}

export function dueServiceBillingAlerts(billing: ServiceBillingInfo, now = new Date()): ServiceBillingAlertKey[] {
  const dueAt = startOfDay(new Date(billing.currentPeriodEndsAt)).getTime();
  const today = startOfDay(now).getTime();
  const alerts: Array<{ key: ServiceBillingAlertKey; day: number }> = [
    { key: "before_due", day: addDays(new Date(dueAt), -serviceBillingPolicy.alertBeforeDays).getTime() },
    { key: "due", day: dueAt },
    { key: "after_due", day: addDays(new Date(dueAt), serviceBillingPolicy.alertAfterDays).getTime() }
  ];
  return alerts
    .filter((alert) => alert.day === today && !billing.alertsSent?.[alert.key])
    .map((alert) => alert.key);
}

export function serviceBillingAlertText(key: ServiceBillingAlertKey, billing: ServiceBillingInfo) {
  const dueDate = formatDate(new Date(billing.currentPeriodEndsAt));
  const graceDate = formatDate(new Date(billing.graceEndsAt));
  const price = formatMoney(billing.renewalPriceCents);
  if (key === "before_due") {
    return {
      title: "Renovação do seu serviço Achei X",
      message: `Seu perfil de serviços vence em 3 dias, em ${dueDate}. A renovação será ${price} no Plano PRO por 12 meses, com tolerância até ${graceDate}.`
    };
  }
  if (key === "due") {
    return {
      title: "Seu serviço vence hoje",
      message: `Seu perfil de serviços vence hoje (${dueDate}). Renove pelo Plano PRO por ${price} para manter a exibição por mais 12 meses. Tolerância até ${graceDate}.`
    };
  }
  return {
    title: "Serviço pendente de renovação",
    message: `Seu perfil de serviços está pendente desde ${dueDate}. Ele continua em tolerância até ${graceDate}; depois disso será ocultado, sem excluir sua conta.`
  };
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setMonth(next.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * oneDayMs);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function validIso(value: unknown) {
  if (typeof value !== "string") return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function normalizeBillingStatus(value: unknown): ServiceBillingStatus {
  return value === "ACTIVE" || value === "GRACE" || value === "HIDDEN" ? value : "TRIALING";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
