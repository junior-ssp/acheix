import { reconcileAsaasPayment } from "@/lib/payment-reconciliation";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("Payment")
    .select("id,status,amountCents")
    .eq("status", "PENDING")
    .eq("provider", "ASAAS")
    .lte("createdAt", cutoff)
    .order("createdAt", { ascending: true })
    .limit(100);
  throwDbError(error);

  const summary = { checked: 0, confirmed: 0, pending: 0, unmapped: 0, unavailable: 0, amount_mismatch: 0, failed: 0 };
  for (const payment of data ?? []) {
    summary.checked += 1;
    try {
      const result = await reconcileAsaasPayment(payment);
      summary[result.status] += 1;
    } catch (reconciliationError) {
      summary.failed += 1;
      await db().from("AuditLog").insert({
        id: newDbId(),
        userId: null,
        action: "payment.asaas.reconciliation_failed",
        metadata: { paymentId: payment.id, error: reconciliationError instanceof Error ? reconciliationError.message : String(reconciliationError) }
      });
    }
  }

  return Response.json({ ok: summary.failed === 0, ...summary });
}
