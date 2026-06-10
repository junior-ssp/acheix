import { addDays } from "@/lib/expiration-policy";
import { createNotification } from "@/lib/notifications";
import { activateServiceProBilling } from "@/lib/service-billing-policy";
import { parseServiceComplement } from "@/lib/service-contact-disclosure";
import { db, isUniqueViolation, newDbId, throwDbError } from "@/lib/supabase-db";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
type PaidPlanCode = "BRONZE" | "SILVER" | "GOLD" | "X6" | "X12";
type PaymentForConfirmation = {
  id: string;
  userId: string;
  amountCents: number;
  status: PaymentStatus | string;
  provider: string | null;
  providerRef: string | null;
  updatedAt: string | null;
};

const paidStatuses: PaymentStatus[] = ["PAID"];
const paidEffectGraceMs = 30_000;

export function parseRenewProviderRef(providerRef: string | null | undefined) {
  const [kind, listingId, planCode] = String(providerRef ?? "").split(":");
  if (kind !== "renew" || !listingId || !isPaidPlanCode(planCode)) return null;
  return { listingId, planCode };
}

export function parsePublishProviderRef(providerRef: string | null | undefined) {
  const [kind, listingId, planCode] = String(providerRef ?? "").split(":");
  if (kind !== "publish" || !listingId || !isPaidPlanCode(planCode)) return null;
  return { listingId, planCode };
}

export function parseServiceProviderRef(providerRef: string | null | undefined) {
  const [kind, profileId, planCode] = String(providerRef ?? "").split(":");
  if (kind !== "service" || !profileId || planCode !== "SERVICE_PRO") return null;
  return { profileId, planCode: "SERVICE_PRO" as const };
}

export async function findPaymentForConfirmation(paymentId: string) {
  const { data, error } = await db()
    .from("Payment")
    .select("id,userId,amountCents,status,provider,providerRef,updatedAt")
    .eq("id", paymentId)
    .maybeSingle();
  throwDbError(error);
  return data as PaymentForConfirmation | null;
}

export async function confirmRenewalPayment(paymentId: string) {
  const supabase = db();
  const payment = await findPaymentForConfirmation(paymentId);
  if (!payment) throw new Error("Pagamento não encontrado.");

  const renew = parseRenewProviderRef(payment.providerRef);
  const publish = parsePublishProviderRef(payment.providerRef);
  const service = parseServiceProviderRef(payment.providerRef);
  if (service) return confirmServicePayment(payment, service);
  const reference = renew ?? publish;
  if (!reference) throw new Error("Pagamento não possui referência de anúncio válida.");

  const [listingResult, planResult] = await Promise.all([
    supabase.from("Listing").select("id,slug,title").eq("id", reference.listingId).maybeSingle(),
    supabase.from("Plan").select("id,code,durationDays").eq("code", reference.planCode).maybeSingle()
  ]);
  throwDbError(listingResult.error);
  throwDbError(planResult.error);
  if (!listingResult.data) throw new Error("Anúncio não encontrado para confirmação de pagamento.");
  if (!planResult.data) throw new Error("Plano não encontrado para confirmação de pagamento.");

  const existingSubscription = await findPaymentSubscription(payment.id);
  if (paidStatuses.includes(payment.status as PaymentStatus) && existingSubscription) return payment;
  if (paidStatuses.includes(payment.status as PaymentStatus) && !isOldEnoughForReconciliation(payment.updatedAt)) return payment;

  const now = new Date();
  let paidPayment = payment;
  let paidAt = now;

  if (!paidStatuses.includes(payment.status as PaymentStatus)) {
    const { data: updatedPayment, error: updatePaymentError } = await supabase
      .from("Payment")
      .update({ status: "PAID", updatedAt: now.toISOString() })
      .eq("id", payment.id)
      .eq("status", "PENDING")
      .select("id,userId,amountCents,status,provider,providerRef,updatedAt")
      .maybeSingle();
    throwDbError(updatePaymentError);

    if (!updatedPayment) {
      const currentPayment = await findPaymentForConfirmation(payment.id);
      if (!currentPayment) throw new Error("Pagamento não encontrado após confirmação.");
      return currentPayment;
    }
    paidPayment = updatedPayment as PaymentForConfirmation;
  } else {
    const updatedAt = payment.updatedAt ? new Date(payment.updatedAt) : now;
    paidAt = Number.isFinite(updatedAt.getTime()) ? updatedAt : now;
  }

  const expiresAt = addDays(paidAt, planResult.data.durationDays);
  const { error: updateListingError } = await supabase
    .from("Listing")
    .update({
      planId: planResult.data.id,
      status: "ACTIVE",
      expiresAt: expiresAt.toISOString(),
      expiredNotifiedAt: null,
      updatedAt: paidAt.toISOString()
    })
    .eq("id", listingResult.data.id);
  throwDbError(updateListingError);

  const subscriptionAfterUpdate = await findPaymentSubscription(payment.id);
  if (!subscriptionAfterUpdate) {
    const { error: subscriptionError } = await supabase.from("Subscription").insert({
      id: newDbId(),
      listingId: listingResult.data.id,
      planId: planResult.data.id,
      paymentId: payment.id,
      startsAt: paidAt.toISOString(),
      endsAt: expiresAt.toISOString()
    });
    if (!isUniqueViolation(subscriptionError)) throwDbError(subscriptionError);
  }

  const { error: auditError } = await supabase.from("AuditLog").insert({
    id: newDbId(),
    userId: paidPayment.userId,
    action: renew ? "payment.renewal_confirmed" : "payment.publish_confirmed",
    metadata: { paymentId: paidPayment.id, listingId: listingResult.data.id, planCode: planResult.data.code, expiresAt: expiresAt.toISOString() }
  });
  throwDbError(auditError);

  await createNotification(
    paidPayment.userId,
    "Pagamento confirmado",
    `Seu anúncio "${listingResult.data.title ?? "Anúncio"}" foi ativado com sucesso.`,
    {
      primaryActionLabel: "Ver anúncio",
      primaryActionUrl: listingResult.data.slug ? `/anuncios/${listingResult.data.slug}` : "/dashboard?meus=ACTIVE#meus-anuncios"
    }
  );

  return paidPayment;
}

async function confirmServicePayment(payment: PaymentForConfirmation, reference: { profileId: string; planCode: "SERVICE_PRO" }) {
  const supabase = db();
  const { data: profile, error: profileError } = await supabase
    .from("service_profiles")
    .select("id,user_id,name,nome_fantasia,complemento")
    .eq("id", reference.profileId)
    .maybeSingle();
  throwDbError(profileError);
  if (!profile) throw new Error("Perfil de serviço não encontrado para confirmação de pagamento.");

  const now = new Date();
  let paidPayment = payment;
  let paidAt = now;

  if (!paidStatuses.includes(payment.status as PaymentStatus)) {
    const { data: updatedPayment, error: updatePaymentError } = await supabase
      .from("Payment")
      .update({ status: "PAID", updatedAt: now.toISOString() })
      .eq("id", payment.id)
      .eq("status", "PENDING")
      .select("id,userId,amountCents,status,provider,providerRef,updatedAt")
      .maybeSingle();
    throwDbError(updatePaymentError);
    if (!updatedPayment) {
      const currentPayment = await findPaymentForConfirmation(payment.id);
      if (!currentPayment) throw new Error("Pagamento não encontrado após confirmação.");
      return currentPayment;
    }
    paidPayment = updatedPayment as PaymentForConfirmation;
  } else {
    const updatedAt = payment.updatedAt ? new Date(payment.updatedAt) : now;
    paidAt = Number.isFinite(updatedAt.getTime()) ? updatedAt : now;
  }

  const complement = parseServiceComplement(profile.complemento);
  const serviceBilling = activateServiceProBilling(complement.serviceBilling, paidAt);
  const pendingServicePro = isRecord(complement.pendingServicePro) ? complement.pendingServicePro : {};
  const nextLogo = typeof pendingServicePro.companyLogo === "string" && pendingServicePro.companyLogo ? pendingServicePro.companyLogo : undefined;
  const { error: updateProfileError } = await supabase
    .from("service_profiles")
    .update({
      active: true,
      status: "ACTIVE",
      complemento: JSON.stringify({ ...complement, serviceBilling, pendingServicePro: null }),
      ...(nextLogo ? { logo_empresa: nextLogo } : {}),
      last_active_at: paidAt.toISOString(),
      updated_at: paidAt.toISOString(),
      paused_at: null,
      archived_at: null,
      dormant_at: null,
      closed_at: null
    })
    .eq("id", profile.id);
  throwDbError(updateProfileError);

  const { error: auditError } = await supabase.from("AuditLog").insert({
    id: newDbId(),
    userId: paidPayment.userId,
    action: "payment.service_pro_confirmed",
    metadata: {
      paymentId: paidPayment.id,
      profileId: profile.id,
      planCode: reference.planCode,
      expiresAt: serviceBilling.currentPeriodEndsAt
    }
  });
  throwDbError(auditError);

  await createNotification(
    paidPayment.userId,
    "Plano PRO confirmado",
    `Seu perfil de serviços "${profile.nome_fantasia ?? profile.name ?? "Prestador"}" foi ativado no Plano PRO por 12 meses.`,
    {
      primaryActionLabel: "Ver meus serviços",
      primaryActionUrl: "/dashboard#meus-servicos"
    }
  );

  return paidPayment;
}

async function findPaymentSubscription(paymentId: string) {
  const { data, error } = await db()
    .from("Subscription")
    .select("id")
    .eq("paymentId", paymentId)
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return data;
}

function isOldEnoughForReconciliation(updatedAt: string | null | undefined) {
  const time = updatedAt ? new Date(updatedAt).getTime() : 0;
  return Number.isFinite(time) && Date.now() - time > paidEffectGraceMs;
}

function isPaidPlanCode(value: string | undefined): value is PaidPlanCode {
  return value === "BRONZE" || value === "SILVER" || value === "GOLD" || value === "X6" || value === "X12";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
