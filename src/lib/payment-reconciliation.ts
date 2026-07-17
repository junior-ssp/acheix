import { fetchAsaasPayment, findAsaasPaymentByInternalPaymentId, isAsaasConfigured, isAsaasPaidStatus } from "@/lib/asaas";
import { confirmRenewalPayment } from "@/lib/payments";
import { db, throwDbError } from "@/lib/supabase-db";

export type PendingPaymentForReconciliation = {
  id: string;
  status: string;
  amountCents: number;
};

export type PaymentReconciliationResult =
  | { status: "confirmed"; payment: Awaited<ReturnType<typeof confirmRenewalPayment>> }
  | { status: "pending" | "unmapped" | "unavailable" | "amount_mismatch"; payment: PendingPaymentForReconciliation };

export async function reconcileAsaasPayment(payment: PendingPaymentForReconciliation): Promise<PaymentReconciliationResult> {
  if (payment.status !== "PENDING") return { status: "pending", payment };
  if (!isAsaasConfigured()) return { status: "unavailable", payment };

  const reference = await findAsaasPaymentByInternalPaymentId(payment.id);
  if (!reference?.asaasPaymentId) return { status: "unmapped", payment };

  const providerPayment = await fetchAsaasPayment(reference.asaasPaymentId);
  if (!isAsaasPaidStatus(providerPayment.status)) return { status: "pending", payment };
  if (typeof providerPayment.value !== "number" || !Number.isFinite(providerPayment.value)) {
    return { status: "unavailable", payment };
  }

  const receivedAmountCents = Math.round(providerPayment.value * 100);
  if (receivedAmountCents !== payment.amountCents) return { status: "amount_mismatch", payment };

  return { status: "confirmed", payment: await confirmRenewalPayment(payment.id) };
}

export async function reconcilePendingAsaasPaymentsForUser(userId: string) {
  const { data, error } = await db()
    .from("Payment")
    .select("id,status,amountCents")
    .eq("userId", userId)
    .eq("status", "PENDING")
    .eq("provider", "ASAAS")
    .order("createdAt", { ascending: true })
    .limit(20);
  throwDbError(error);
  let confirmed = 0;
  for (const payment of data ?? []) {
    const result = await reconcileAsaasPayment(payment).catch(() => null);
    if (result?.status === "confirmed") confirmed += 1;
  }
  return { checked: data?.length ?? 0, confirmed };
}
