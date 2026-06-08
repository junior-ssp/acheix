import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const messageSafetyConfigAction = "admin.message_safety_keywords.updated";

export const defaultBlockedMessageTerms = [
  "Sou Corretor",
  "Sou Corretora",
  "QuintoAndar",
  "Quinto Andar",
  "anunciar seu imóvel",
  "anunciar o seu imóvel",
  "anunciar seu imovel",
  "anunciar o seu imovel",
  "nosso site",
  "minha imobiliária",
  "minha imobiliaria",
  "consultor imobiliário",
  "consultora imobiliária",
  "captação",
  "captacao",
  "parceria comercial"
];

export const captationBlockedMessage =
  "Para proteger nossos anunciantes, o Achei X não permite mensagens de captação, prospecção comercial, oferta de divulgação em outras plataformas ou links externos. Use este canal apenas para interesse real no anúncio ou serviço.";

type SafetyUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  accountBlockedAt?: string | Date | null;
  accountBlockedReason?: string | null;
};

type MessageSafetyInput = {
  request: Request;
  sender: SafetyUser | null;
  targetUserId: string;
  message: string;
  context:
    | { type: "LISTING"; listingId: string }
    | { type: "SERVICE"; profileId: string };
};

type SafetyResult = {
  allowed: boolean;
  status?: number;
  message?: string;
  reason?: string;
};

export async function getBlockedMessageTerms() {
  try {
    const { data, error } = await db()
      .from("AuditLog")
      .select("metadata,createdAt")
      .eq("action", messageSafetyConfigAction)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwDbError(error);
    const configured = Array.isArray(data?.metadata?.terms) ? data.metadata.terms : null;
    return normalizeTerms(configured?.length ? configured : defaultBlockedMessageTerms);
  } catch {
    return normalizeTerms(defaultBlockedMessageTerms);
  }
}

export async function getMessageSafetyAdminConfig() {
  const terms = await getBlockedMessageTerms();
  return {
    terms,
    text: terms.join("\n"),
    defaultText: normalizeTerms(defaultBlockedMessageTerms).join("\n")
  };
}

export async function validateContactMessageSafety(input: MessageSafetyInput): Promise<SafetyResult> {
  const baseMetadata = {
    ...contextMetadata(input.context),
    targetUserId: input.targetUserId,
    senderUserId: input.sender?.id ?? null,
    senderEmail: input.sender?.email ?? null,
    ip: requestIp(input.request),
    userAgent: input.request.headers.get("user-agent") ?? "unknown"
  };

  if (input.sender?.accountBlockedAt) {
    await insertSafetyAudit(input.sender.id, "message_safety.blocked_account", baseMetadata);
    return { allowed: false, status: 403, reason: "blocked_account", message: "Sua conta está temporariamente impedida de enviar mensagens. Entre em contato com o suporte do Achei X." };
  }

  if (input.sender && await isUserBlockedByTarget(input.targetUserId, input.sender.id)) {
    await insertSafetyAudit(input.sender.id, "message_safety.blocked_by_target", baseMetadata);
    return { allowed: false, status: 403, reason: "blocked_by_target", message: "Este anunciante não está recebendo novas mensagens da sua conta." };
  }

  const externalLinks = findExternalLinks(input.message);
  if (externalLinks.length) {
    await insertSafetyAudit(input.sender?.id ?? null, "message_safety.external_link_blocked", { ...baseMetadata, externalLinks });
    return { allowed: false, status: 403, reason: "external_link", message: captationBlockedMessage };
  }

  const matchedTerms = matchBlockedTerms(input.message, await getBlockedMessageTerms());
  if (matchedTerms.length) {
    await insertSafetyAudit(input.sender?.id ?? null, "message_safety.keyword_blocked", { ...baseMetadata, matchedTerms });
    return { allowed: false, status: 403, reason: "keyword", message: captationBlockedMessage };
  }

  if (input.sender) {
    const limits = await checkSenderLimits(input.sender.id, input.context);
    if (!limits.allowed) {
      await insertSafetyAudit(input.sender.id, "message_safety.rate_limited", { ...baseMetadata, ...limits.metadata });
      return { allowed: false, status: 429, reason: "rate_limit", message: limits.message };
    }
  }

  return { allowed: true };
}

export function parseBlockedTermsText(text: string) {
  return normalizeTerms(text.split(/\r?\n|,/g));
}

function normalizeTerms(values: unknown[] | undefined) {
  return [...new Set((values ?? [])
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length >= 2))]
    .slice(0, 300);
}

function matchBlockedTerms(message: string, terms: string[]) {
  const normalizedMessage = normalizeForMatch(message);
  return terms.filter((term) => normalizedMessage.includes(normalizeForMatch(term)));
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function findExternalLinks(message: string) {
  const matches = message.match(/(?:https?:\/\/|www\.)[^\s<>"')]+/gi) ?? [];
  return matches.filter((rawUrl) => {
    const url = rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
      return !["acheix.com.br", "achei-x.com.br", "localhost", "127.0.0.1"].includes(host);
    } catch {
      return true;
    }
  });
}

async function isUserBlockedByTarget(targetUserId: string, senderUserId: string) {
  const { data, error } = await db()
    .from("AuditLog")
    .select("id")
    .eq("userId", targetUserId)
    .eq("action", "user.blocked")
    .contains("metadata", { blockedUserId: senderUserId })
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return Boolean(data);
}

async function checkSenderLimits(senderUserId: string, context: MessageSafetyInput["context"]) {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const sinceDay = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  if (context.type === "LISTING") {
    const { count: sameListingCount, error: sameListingError } = await db()
      .from("ContactLead")
      .select("id", { count: "exact", head: true })
      .eq("interestedUserId", senderUserId)
      .eq("listingId", context.listingId)
      .gte("createdAt", since24h);
    throwDbError(sameListingError);
    if ((sameListingCount ?? 0) >= 1) {
      return {
        allowed: false,
        message: "Você já enviou uma mensagem para este anúncio nas últimas 24 horas. Aguarde o anunciante responder.",
        metadata: { sameListingCount }
      };
    }
  }

  const [listingDaily, serviceDaily] = await Promise.all([
    db()
      .from("ContactLead")
      .select("id", { count: "exact", head: true })
      .eq("interestedUserId", senderUserId)
      .gte("createdAt", sinceDay),
    db()
      .from("ServiceContact")
      .select("id", { count: "exact", head: true })
      .eq("interestedUserId", senderUserId)
      .gte("createdAt", sinceDay)
  ]);
  throwDbError(listingDaily.error);
  throwDbError(serviceDaily.error);

  const dailyCount = (listingDaily.count ?? 0) + (serviceDaily.count ?? 0);
  if (dailyCount >= 10) {
    return {
      allowed: false,
      message: "Por segurança, sua conta atingiu o limite diário de mensagens. Tente novamente amanhã.",
      metadata: { dailyCount }
    };
  }

  return { allowed: true, metadata: { dailyCount } };
}

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

function contextMetadata(context: MessageSafetyInput["context"]) {
  return context.type === "LISTING"
    ? { contactType: "LISTING", listingId: context.listingId }
    : { contactType: "SERVICE", profileId: context.profileId };
}

async function insertSafetyAudit(userId: string | null, action: string, metadata: Record<string, unknown>) {
  const { error } = await db().from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
  throwDbError(error);
}
