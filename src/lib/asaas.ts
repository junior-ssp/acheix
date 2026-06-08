import { formatPhone, onlyDigits } from "@/lib/formatters";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

type AsaasCustomerInput = {
  name: string;
  email: string;
  cpfCnpj: string | null;
  phone: string | null;
};

type AsaasPaymentInput = {
  paymentId: string;
  amountCents: number;
  description: string;
  customer: AsaasCustomerInput;
  forceNew?: boolean;
};

type AsaasPayment = {
  id: string;
  status?: string;
  value?: number;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixTransaction?: string;
};

type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

const asaasCreatedAction = "payment.asaas.created";

export function isAsaasConfigured() {
  return Boolean(process.env.ASAAS_API_KEY);
}

export async function ensureAsaasPixCharge(input: AsaasPaymentInput) {
  const existing = input.forceNew ? null : await findAsaasPaymentByInternalPaymentId(input.paymentId);
  let asaasPayment: Partial<AsaasPayment> & { id: string } = existing?.asaasPaymentId
    ? await fetchAsaasPayment(existing.asaasPaymentId).catch(() => ({ id: existing.asaasPaymentId, status: existing.status }))
    : await createAsaasPayment(input);
  let qrCode: AsaasPixQrCode;

  try {
    qrCode = await getAsaasPixQrCode(asaasPayment.id);
  } catch (error) {
    if (!isPixNotAcceptedError(error)) throw error;
    asaasPayment = await createAsaasPayment(input);
    qrCode = await getAsaasPixQrCode(asaasPayment.id);
  }

  return {
    provider: "ASAAS",
    providerPaymentId: asaasPayment.id,
    providerStatus: asaasPayment.status ?? null,
    invoiceUrl: asaasPayment.invoiceUrl ?? null,
    pixCopyPaste: qrCode.payload ?? "",
    pixQrCodeBase64: qrCode.encodedImage ?? "",
    pixExpiresAt: qrCode.expirationDate ?? null
  };
}

export async function findInternalPaymentIdByAsaasPaymentId(asaasPaymentId: string) {
  const { data, error } = await db()
    .from("AuditLog")
    .select("metadata,createdAt")
    .eq("action", asaasCreatedAction)
    .contains("metadata", { asaasPaymentId })
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return typeof data?.metadata?.paymentId === "string" ? data.metadata.paymentId : null;
}

export async function fetchAsaasPayment(asaasPaymentId: string) {
  return asaasRequest<AsaasPayment>(`/v3/payments/${encodeURIComponent(asaasPaymentId)}`);
}

async function createAsaasPayment(input: AsaasPaymentInput) {
  const customerId = await createAsaasCustomer(input.customer);
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const payment = await asaasRequest<AsaasPayment>("/v3/payments", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "PIX",
      value: input.amountCents / 100,
      dueDate,
      description: input.description,
      externalReference: input.paymentId
    }
  });

  await updateInternalPaymentWithAsaasId(input.paymentId, payment.id);

  const { error } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: null,
    action: asaasCreatedAction,
    metadata: {
      paymentId: input.paymentId,
      asaasPaymentId: payment.id,
      status: payment.status ?? null,
      amountCents: input.amountCents,
      dueDate
    }
  });
  throwDbError(error);

  return payment;
}

async function updateInternalPaymentWithAsaasId(paymentId: string, asaasPaymentId: string) {
  const now = new Date().toISOString();
  const { error } = await db()
    .from("Payment")
    .update({ provider: "ASAAS", asaasPaymentId, updatedAt: now })
    .eq("id", paymentId);
  if (!isMissingAsaasPaymentIdColumn(error)) {
    throwDbError(error);
    return;
  }

  const { error: fallbackError } = await db()
    .from("Payment")
    .update({ provider: "ASAAS", updatedAt: now })
    .eq("id", paymentId);
  throwDbError(fallbackError);
}

function isPixNotAcceptedError(error: unknown) {
  return error instanceof Error && normalize(error.message).includes(normalize("não aceita pix"));
}

async function createAsaasCustomer(input: AsaasCustomerInput) {
  const cpfCnpj = input.cpfCnpj ? onlyDigits(input.cpfCnpj) : "";
  const phone = input.phone ? onlyDigits(input.phone) : "";
  const customer = await asaasRequest<{ id: string }>("/v3/customers", {
    method: "POST",
    body: {
      name: input.name,
      email: input.email,
      cpfCnpj: cpfCnpj.length === 11 || cpfCnpj.length === 14 ? cpfCnpj : undefined,
      mobilePhone: phone.length === 11 ? phone : undefined,
      phone: phone.length >= 10 ? formatPhone(phone) : undefined
    }
  });
  return customer.id;
}

async function getAsaasPixQrCode(asaasPaymentId: string) {
  return asaasRequest<AsaasPixQrCode>(`/v3/payments/${encodeURIComponent(asaasPaymentId)}/pixQrCode`);
}

async function findAsaasPaymentByInternalPaymentId(paymentId: string) {
  const { data: paymentRow, error: paymentError } = await db()
    .from("Payment")
    .select("asaasPaymentId")
    .eq("id", paymentId)
    .maybeSingle();
  if (!isMissingAsaasPaymentIdColumn(paymentError)) {
    throwDbError(paymentError);
    if (paymentRow?.asaasPaymentId) return { asaasPaymentId: String(paymentRow.asaasPaymentId), status: null };
  }

  const { data, error } = await db()
    .from("AuditLog")
    .select("metadata,createdAt")
    .eq("action", asaasCreatedAction)
    .contains("metadata", { paymentId })
    .order("createdAt", { ascending: false })
    .limit(1);
  throwDbError(error);
  const row = data?.[0];
  if (!row?.metadata?.asaasPaymentId) return null;
  return {
    asaasPaymentId: String(row.metadata.asaasPaymentId),
    status: typeof row.metadata.status === "string" ? row.metadata.status : null
  };
}

function isMissingAsaasPaymentIdColumn(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "message" in error
    && String((error as { message?: unknown }).message).toLowerCase().includes("asaaspaymentid")
  );
}

async function asaasRequest<T>(path: string, options: { method?: string; body?: Record<string, unknown> } = {}): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");
  const baseUrl = (process.env.ASAAS_BASE_URL || "https://api.asaas.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      access_token: apiKey
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.errors)
      ? data.errors.map((item: any) => item.description ?? item.message).filter(Boolean).join(" ")
      : data?.message;
    throw new Error(message || `Asaas retornou HTTP ${response.status}.`);
  }
  return data as T;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
