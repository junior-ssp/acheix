import { db, throwDbError } from "@/lib/supabase-db";

export type FinanceRange = {
  start: Date;
  end: Date;
  startInput: string;
  endInput: string;
};

export type FinanceSummary = {
  label: string;
  start: Date;
  end: Date;
  revenueCents: number;
  paidPayments: number;
  renewedListings: number;
  renewalPercent: number;
};

export type FinancePaymentRow = {
  id: string;
  date: Date;
  userName: string;
  userEmail: string;
  amountCents: number;
  status: string;
  provider: string;
  providerRef: string;
  kind: string;
  listings: string;
  plans: string;
};

const timeZone = "America/Sao_Paulo";

export function getCurrentBrazilDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function parseFinanceRange(start?: string, end?: string): FinanceRange {
  const today = getCurrentBrazilDateInput();
  const startInput = isDateInput(start) ? start! : today;
  const endInput = isDateInput(end) ? end! : today;

  return {
    start: brazilDateInputToDate(startInput, false),
    end: brazilDateInputToDate(endInput, true),
    startInput,
    endInput
  };
}

export async function getFinanceData(range: FinanceRange) {
  const now = new Date();
  const current = brazilDateParts(now);
  const ranges = [
    { label: "Hoje", ...dateRange(current.year, current.month, current.day, current.year, current.month, current.day) },
    { label: "Semana", start: addDays(now, -6), end: now },
    { label: "Quinzena", start: addDays(now, -14), end: now },
    { label: "Mês", ...dateRange(current.year, current.month, 1, current.year, current.month, current.day) },
    { label: "Trimestre", ...dateRange(current.year, quarterStartMonth(current.month), 1, current.year, current.month, current.day) },
    { label: "Semestre", ...dateRange(current.year, current.month <= 6 ? 1 : 7, 1, current.year, current.month, current.day) },
    { label: "Ano", ...dateRange(current.year, 1, 1, current.year, current.month, current.day) },
    { label: "Período", start: range.start, end: range.end }
  ];

  const [summaries, rows] = await Promise.all([
    Promise.all(ranges.map((item) => summarizeRange(item.label, item.start, item.end))),
    getPaymentRows(range.start, range.end)
  ]);

  return { summaries, rows };
}

export async function getPaymentRows(start: Date, end: Date): Promise<FinancePaymentRow[]> {
  const { data, error } = await db()
    .from("Payment")
    .select("id,userId,amountCents,status,provider,providerRef,updatedAt")
    .gte("updatedAt", start.toISOString())
    .lte("updatedAt", end.toISOString())
    .order("updatedAt", { ascending: false })
    .limit(500);
  throwDbError(error);

  const payments = (data ?? []) as Array<any>;
  const userIds = [...new Set(payments.map((payment) => payment.userId).filter(Boolean))];
  const paymentIds = payments.map((payment) => payment.id);
  const [usersById, subscriptionsByPayment] = await Promise.all([
    findUsersByIds(userIds),
    findSubscriptionsByPaymentIds(paymentIds)
  ]);

  return payments.map((payment) => {
    const subscriptions = subscriptionsByPayment.get(payment.id) ?? [];
    const user = usersById.get(payment.userId);
    return {
      id: payment.id,
      date: new Date(payment.updatedAt),
      userName: user?.name ?? "Usuário",
      userEmail: user?.email ?? "",
      amountCents: payment.amountCents,
      status: payment.status,
      provider: payment.provider,
      providerRef: payment.providerRef ?? "",
      kind: payment.providerRef?.startsWith("renew:") || subscriptions.some((item) => item.paymentId) ? "Renovação" : "Pagamento",
      listings: subscriptions.map((item) => item.listing?.title).filter(Boolean).join(" | "),
      plans: subscriptions.map((item) => item.plan?.name).filter(Boolean).join(" | ")
    };
  });
}

async function summarizeRange(label: string, start: Date, end: Date): Promise<FinanceSummary> {
  const { data: paidRows, error } = await db()
    .from("Payment")
    .select("id,amountCents")
    .eq("status", "PAID")
    .gte("updatedAt", start.toISOString())
    .lte("updatedAt", end.toISOString());
  throwDbError(error);
  const paidPayments = (paidRows ?? []) as Array<{ id: string; amountCents: number }>;
  const paymentIds = paidPayments.map((payment) => payment.id);
  const renewedListings = paymentIds.length ? await countSubscriptionsByPaymentIds(paymentIds) : 0;

  return {
    label,
    start,
    end,
    revenueCents: paidPayments.reduce((sum, payment) => sum + (payment.amountCents ?? 0), 0),
    paidPayments: paidPayments.length,
    renewedListings,
    renewalPercent: paidPayments.length > 0 ? Math.round((renewedListings / paidPayments.length) * 1000) / 10 : 0
  };
}

async function findUsersByIds(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; name: string; email: string }>();
  const { data, error } = await db().from("User").select("id,name,email").in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as Array<{ id: string; name: string; email: string }>).map((user) => [user.id, user]));
}

async function findSubscriptionsByPaymentIds(paymentIds: string[]) {
  if (!paymentIds.length) return new Map<string, Array<any>>();
  const { data, error } = await db()
    .from("Subscription")
    .select("id,paymentId,listingId,planId")
    .in("paymentId", paymentIds);
  throwDbError(error);
  const subscriptions = (data ?? []) as Array<any>;
  const listingIds = [...new Set(subscriptions.map((item) => item.listingId).filter(Boolean))];
  const planIds = [...new Set(subscriptions.map((item) => item.planId).filter(Boolean))];
  const [listingsById, plansById] = await Promise.all([findListingsByIds(listingIds), findPlansByIds(planIds)]);
  const grouped = new Map<string, Array<any>>();
  for (const subscription of subscriptions) {
    const item = {
      ...subscription,
      listing: listingsById.get(subscription.listingId) ?? null,
      plan: plansById.get(subscription.planId) ?? null
    };
    const current = grouped.get(subscription.paymentId) ?? [];
    current.push(item);
    grouped.set(subscription.paymentId, current);
  }
  return grouped;
}

async function findListingsByIds(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; title: string; slug: string }>();
  const { data, error } = await db().from("Listing").select("id,title,slug").in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as Array<{ id: string; title: string; slug: string }>).map((listing) => [listing.id, listing]));
}

async function findPlansByIds(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; name: string; code: string }>();
  const { data, error } = await db().from("Plan").select("id,name,code").in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as Array<{ id: string; name: string; code: string }>).map((plan) => [plan.id, plan]));
}

async function countSubscriptionsByPaymentIds(paymentIds: string[]) {
  const { count, error } = await db()
    .from("Subscription")
    .select("id", { count: "exact", head: true })
    .in("paymentId", paymentIds);
  throwDbError(error);
  return count ?? 0;
}

function isDateInput(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function brazilDateInputToDate(value: string, endOfDay: boolean) {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}-03:00`);
}

function dateRange(startYear: number, startMonth: number, startDay: number, endYear: number, endMonth: number, endDay: number) {
  const startInput = `${startYear}-${pad(startMonth)}-${pad(startDay)}`;
  const endInput = `${endYear}-${pad(endMonth)}-${pad(endDay)}`;
  return { start: brazilDateInputToDate(startInput, false), end: brazilDateInputToDate(endInput, true) };
}

function brazilDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function quarterStartMonth(month: number) {
  return Math.floor((month - 1) / 3) * 3 + 1;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
