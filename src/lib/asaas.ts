import { formatPhone, onlyDigits } from "@/lib/formatters";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { isValidCnpj, isValidCpf } from "@/lib/validators";

type AsaasCustomerInput = {
  name: string;
  email: string;
  cpfCnpj: string | null;
  phone: string | null;
};

type AsaasCustomerDocumentInput = {
  accountType?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
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
const asaasMinimumPixAmountCents = 500;

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

export async function findAsaasPaymentByInternalPaymentId(paymentId: string) {
  return findAsaasPaymentByInternalPaymentIdInternal(paymentId);
}

export function isAsaasPaidStatus(status: string | undefined) {
  return ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(String(status ?? "").toUpperCase());
}

export function selectAsaasCustomerDocument(input: AsaasCustomerDocumentInput) {
  const cpf = onlyDigits(input.cpf);
  const cnpj = onlyDigits(input.cnpj);

  if (input.accountType === "CNPJ") {
    if (isValidCnpj(cnpj)) return cnpj;
    if (isValidCpf(cpf)) return cpf;
    return null;
  }

  if (isValidCpf(cpf)) return cpf;
  if (isValidCnpj(cnpj)) return cnpj;
  return null;
}

async function createAsaasPayment(input: AsaasPaymentInput) {
  if (input.amountCents < asaasMinimumPixAmountCents) {
    throw new Error("O Asaas exige valor mínimo de R$ 5,00 para gerar PIX. Escolha um plano atualizado ou tente novamente em instantes.");
  }

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
  const cpfCnpj = sanitizeAsaasCustomerDocument(input.cpfCnpj);
  if (!cpfCnpj) {
    throw new Error("CPF/CNPJ do cadastro não é válido para gerar PIX no Asaas. Atualize seu perfil com um documento real e tente novamente.");
  }

  const phone = input.phone ? onlyDigits(input.phone) : "";
  const customer = await asaasRequest<{ id: string }>("/v3/customers", {
    method: "POST",
    body: {
      name: input.name,
      email: input.email,
      cpfCnpj,
      mobilePhone: phone.length === 11 ? phone : undefined,
      phone: phone.length >= 10 ? formatPhone(phone) : undefined
    }
  });
  return customer.id;
}

function sanitizeAsaasCustomerDocument(value: string | null | undefined) {
  const digits = onlyDigits(value);
  if (isValidCpf(digits) || isValidCnpj(digits)) return digits;
  return null;
}

async function getAsaasPixQrCode(asaasPaymentId: string) {
  return asaasRequest<AsaasPixQrCode>(`/v3/payments/${encodeURIComponent(asaasPaymentId)}/pixQrCode`);
}

async function findAsaasPaymentByInternalPaymentIdInternal(paymentId: string) {
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
    throw new Error(formatAsaasErrorMessage(message, response.status));
  }
  return data as T;
}

function formatAsaasErrorMessage(message: string | null | undefined, status: number) {
  const text = message || `Asaas retornou HTTP ${status}.`;
  const normalized = normalize(text);
  if (normalized.includes("cpf") || normalized.includes("cnpj")) {
    return "CPF/CNPJ do cadastro não foi aceito pelo Asaas. Atualize seu perfil com um documento real e tente gerar o PIX novamente.";
  }
  return text;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
