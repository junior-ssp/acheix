import { z } from "zod";
import { fetchAsaasPayment, findInternalPaymentIdByAsaasPaymentId, isAsaasConfigured } from "@/lib/asaas";
import { errorResponse, json } from "@/lib/http";
import { confirmRenewalPayment, findPaymentForConfirmation } from "@/lib/payments";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const asaasWebhookSchema = z.object({
  id: z.string().optional(),
  event: z.string().min(1),
  payment: z.object({
    id: z.string().min(1),
    status: z.string().optional(),
    externalReference: z.string().optional().nullable(),
    value: z.number().optional()
  }).passthrough()
}).passthrough();

export async function POST(request: Request) {
  try {
    validateWebhookSecret(request);

    const body = asaasWebhookSchema.parse(await request.json());
    const asaasPaymentId = body.payment.id;
    const paymentId = body.payment.externalReference || await findInternalPaymentIdByAsaasPaymentId(asaasPaymentId);
    const eventKey = buildWebhookEventKey(body);

    await insertWebhookAudit(null, "payment.asaas.webhook.received", {
      event: body.event,
      eventKey,
      asaasPaymentId,
      paymentId,
      status: body.payment.status ?? null
    });

    if (!paymentId) return json({ ok: true, ignored: true, reason: "payment_not_mapped" });
    if (!isPaidEvent(body.event, body.payment.status)) return json({ ok: true, ignored: true, event: body.event });
    if (await wasWebhookProcessed(eventKey)) {
      return json({ ok: true, ignored: true, reason: "webhook_already_processed", eventKey });
    }

    const internalPayment = await findPaymentForConfirmation(paymentId);
    if (!internalPayment) return json({ ok: true, ignored: true, reason: "internal_payment_not_found" });
    let confirmedValue = body.payment.value;

    if (isAsaasConfigured()) {
      const freshPayment = await fetchAsaasPayment(asaasPaymentId);
      if (!isPaidStatus(freshPayment.status)) {
        return json({ ok: true, ignored: true, reason: "asaas_status_not_paid", status: freshPayment.status });
      }
      confirmedValue = freshPayment.value ?? confirmedValue;
    }
    validatePaymentAmount(internalPayment.amountCents, confirmedValue);

    const payment = await confirmRenewalPayment(paymentId);
    await markWebhookProcessed(payment.userId, eventKey, {
      event: body.event,
      paymentId: payment.id,
      asaasPaymentId,
      status: payment.status
    });
    await insertWebhookAudit(payment.userId, "payment.asaas.confirmed", {
      event: body.event,
      eventKey,
      paymentId: payment.id,
      asaasPaymentId,
      status: payment.status
    });

    return json({ ok: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    return errorResponse(error);
  }
}

function validateWebhookSecret(request: Request) {
  const secret = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!secret) return;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    || request.headers.get("x-asaas-webhook-token")
    || request.headers.get("x-webhook-token");
  if (received !== secret) throw new Response(JSON.stringify({ error: "Webhook não autorizado." }), { status: 401 });
}

function isPaidEvent(event: string, status: string | undefined) {
  return ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event) || isPaidStatus(status);
}

function isPaidStatus(status: string | undefined) {
  return ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(String(status ?? "").toUpperCase());
}

function validatePaymentAmount(expectedAmountCents: number, providerValue: number | undefined) {
  if (typeof providerValue !== "number" || !Number.isFinite(providerValue)) {
    throw new Error("Webhook Asaas sem valor de pagamento para conferência.");
  }
  const receivedAmountCents = Math.round(providerValue * 100);
  if (receivedAmountCents !== expectedAmountCents) {
    throw new Error(`Valor do Asaas divergente do Achei X. Esperado ${expectedAmountCents} centavos, recebido ${receivedAmountCents} centavos.`);
  }
}

function buildWebhookEventKey(body: z.infer<typeof asaasWebhookSchema>) {
  return body.id || `${body.event}:${body.payment.id}:${body.payment.status ?? "sem-status"}`;
}

async function wasWebhookProcessed(eventKey: string) {
  const { data: processedWebhook, error: processedWebhookError } = await db()
    .from("processed_webhooks")
    .select("id")
    .eq("event_id", eventKey)
    .limit(1)
    .maybeSingle();
  if (!isMissingProcessedWebhooksTable(processedWebhookError)) {
    throwDbError(processedWebhookError);
    return Boolean(processedWebhook?.id);
  }

  const { data, error } = await db()
    .from("AuditLog")
    .select("id")
    .eq("action", "payment.asaas.webhook.processed")
    .contains("metadata", { eventKey })
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return Boolean(data?.id);
}

async function markWebhookProcessed(userId: string | null, eventKey: string, metadata: Record<string, unknown>) {
  const { error: processedWebhookError } = await db()
    .from("processed_webhooks")
    .insert({
      event_id: eventKey,
      provider: "ASAAS",
      payment_id: typeof metadata.paymentId === "string" ? metadata.paymentId : null,
      provider_payment_id: typeof metadata.asaasPaymentId === "string" ? metadata.asaasPaymentId : null,
      event_name: typeof metadata.event === "string" ? metadata.event : null
    });
  if (processedWebhookError && !isUniqueViolation(processedWebhookError) && !isMissingProcessedWebhooksTable(processedWebhookError)) {
    throwDbError(processedWebhookError);
  }

  await insertWebhookAudit(userId, "payment.asaas.webhook.processed", { ...metadata, eventKey, processedAt: new Date().toISOString() });
}

async function insertWebhookAudit(userId: string | null, action: string, metadata: Record<string, unknown>) {
  const { error } = await db().from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
  throwDbError(error);
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505");
}

function isMissingProcessedWebhooksTable(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "message" in error
    && String((error as { message?: unknown }).message).toLowerCase().includes("processed_webhooks")
  );
}
