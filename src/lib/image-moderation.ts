import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { SessionUser } from "@/lib/auth";
import { db, newDbId } from "@/lib/supabase-db";

export const blockedImageMessage = "Imagem não permitida. Selecione outra imagem!";

type ModerationStatus = "APPROVED" | "REJECTED" | "NEEDS_REVIEW";

type ModerationCategory =
  | "adult"
  | "child_safety"
  | "violence"
  | "drugs"
  | "weapons"
  | "fraud_documents"
  | "criminal_activity"
  | "illegal_animals_environment"
  | "contraband"
  | "people"
  | "other";

type ProviderFinding = {
  category: ModerationCategory | string;
  confidence: number;
  label?: string;
};

type ProviderResult = {
  status?: string;
  decision?: string;
  confidence?: number;
  findings?: ProviderFinding[];
  categories?: ProviderFinding[];
  ocrText?: string;
  text?: string;
  provider?: string;
  raw?: unknown;
};

type ModerationDecision = {
  status: ModerationStatus;
  hash: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  findings: ProviderFinding[];
  ocrText: string;
  provider: string;
  moderationId: string;
  token?: string;
};

type ModerationInput = {
  user: SessionUser;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  originProof?: boolean;
  request: Request;
};

type ApprovedPhoto = {
  url: string;
  moderationToken?: string;
};

const blockedCategories = new Set<ModerationCategory | string>([
  "adult",
  "child_safety",
  "violence",
  "drugs",
  "weapons",
  "fraud_documents",
  "criminal_activity",
  "illegal_animals_environment",
  "contraband"
]);

const ocrBlockedTerms = [
  "rg",
  "cpf",
  "cnh",
  "passaporte",
  "cartao de credito",
  "cartão de crédito",
  "cartao bancario",
  "cartão bancário",
  "comprovante bancario",
  "comprovante bancário",
  "comprovante pix",
  "qr code pix",
  "nude",
  "sexo",
  "programa",
  "cocaina",
  "cocaína",
  "crack",
  "maconha",
  "arma",
  "municao",
  "munição",
  "explosivo",
  "cartao clonado",
  "cartão clonado",
  "dados pessoais"
];

export async function moderateListingImage(input: ModerationInput): Promise<ModerationDecision> {
  const hash = createHash("sha256").update(input.bytes).digest("hex");
  const providerResult = await callImageModerationProvider(input, hash);
  const decision = decideImageModeration(hash, providerResult, Boolean(input.originProof));
  const moderationId = newDbId();
  const url = null;
  const withId = { ...decision, moderationId };

  await recordImageModeration({
    ...withId,
    userId: input.user.id,
    url,
    storagePath: null,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.bytes.length,
    providerRaw: providerResult.raw ?? providerResult,
    ip: requestIp(input.request),
    userAgent: input.request.headers.get("user-agent") ?? "unknown"
  });

  if (decision.status !== "APPROVED") {
    await createImageTrustCase(input.user.id, withId);
    await applyImageRiskPolicy(input.user.id);
  }

  return withId;
}

export async function analyzeIdentityDocumentImage(input: ModerationInput) {
  const hash = createHash("sha256").update(input.bytes).digest("hex");
  const providerResult = await callImageModerationProvider(input, hash);
  const findings = normalizeFindings(providerResult);
  const ocrText = String(providerResult.ocrText ?? providerResult.text ?? "");
  const provider = providerResult.provider ?? "configured-ai";
  const moderationId = newDbId();

  await tryInsertAudit(input.user.id, "identity_document.ocr_analyzed", {
    moderationId,
    hash,
    provider,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.bytes.length,
    hasOcrText: Boolean(ocrText.trim()),
    findings: redactFindings(findings),
    ip: requestIp(input.request),
    userAgent: input.request.headers.get("user-agent") ?? "unknown"
  });

  return {
    moderationId,
    hash,
    provider,
    findings,
    ocrText
  };
}

export async function finalizeApprovedImageModeration(input: {
  userId: string;
  moderationId: string;
  url: string;
  storagePath: string;
  hash: string;
}) {
  await tryInsertAudit(input.userId, "image_moderation.storage_uploaded", input);
  await tryUpdateImageModerationLog(input.moderationId, { url: input.url, storagePath: input.storagePath });
}

export function createImageModerationToken(input: { userId: string; url: string; hash: string; moderationId: string }) {
  const payload = {
    userId: input.userId,
    url: input.url,
    hash: input.hash,
    moderationId: input.moderationId,
    status: "APPROVED",
    exp: Date.now() + 24 * 60 * 60 * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signModerationPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyImageModerationToken(token: string | undefined, userId: string, url: string) {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const expected = signModerationPayload(encoded);
  if (!safeEqual(signature, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      userId?: string;
      url?: string;
      status?: string;
      exp?: number;
    };
    return payload.userId === userId && payload.url === url && payload.status === "APPROVED" && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

export function assertListingPhotosApproved(userId: string, photos: ApprovedPhoto[]) {
  for (const photo of photos) {
    if (!verifyImageModerationToken(photo.moderationToken, userId, photo.url)) {
      return { ok: false, error: blockedImageMessage };
    }
  }
  return { ok: true };
}

function decideImageModeration(hash: string, providerResult: ProviderResult, originProof = false): Omit<ModerationDecision, "moderationId" | "token"> {
  const findings = normalizeFindings(providerResult);
  const ocrText = String(providerResult.ocrText ?? providerResult.text ?? "");
  const ocrFindings = findBlockedOcrTerms(ocrText, originProof).map((term) => ({
    category: "fraud_documents",
    confidence: 0.91,
    label: `ocr:${term}`
  }));
  const allFindings = [...findings, ...ocrFindings];
  const maxBlockedConfidence = Math.max(0, ...allFindings.filter((item) => blockedCategories.has(item.category)).map((item) => item.confidence));
  const explicitDecision = String(providerResult.decision ?? providerResult.status ?? "").toUpperCase();
  const blockThreshold = numberEnv("IMAGE_MODERATION_BLOCK_THRESHOLD", 0.62);
  const reviewThreshold = numberEnv("IMAGE_MODERATION_REVIEW_THRESHOLD", 0.35);
  const riskScore = Math.min(100, Math.round(maxBlockedConfidence * 100));
  const riskLevel = riskScore >= 85 ? "CRITICAL" : riskScore >= 65 ? "HIGH" : riskScore >= 35 ? "MEDIUM" : "LOW";

  if (explicitDecision === "REJECTED" || explicitDecision === "BLOCK" || maxBlockedConfidence >= blockThreshold) {
    return { status: "REJECTED", hash, riskScore, riskLevel, findings: allFindings, ocrText, provider: providerResult.provider ?? "configured-ai" };
  }

  if (explicitDecision === "NEEDS_REVIEW" || explicitDecision === "REVIEW" || maxBlockedConfidence >= reviewThreshold) {
    return { status: "NEEDS_REVIEW", hash, riskScore, riskLevel, findings: allFindings, ocrText, provider: providerResult.provider ?? "configured-ai" };
  }

  if (explicitDecision === "APPROVED" || explicitDecision === "ALLOW") {
    return { status: "APPROVED", hash, riskScore, riskLevel, findings: allFindings, ocrText, provider: providerResult.provider ?? "configured-ai" };
  }

  return { status: "NEEDS_REVIEW", hash, riskScore: Math.max(35, riskScore), riskLevel: riskLevel === "LOW" ? "MEDIUM" : riskLevel, findings: allFindings, ocrText, provider: providerResult.provider ?? "configured-ai" };
}

async function callImageModerationProvider(input: ModerationInput, hash: string): Promise<ProviderResult> {
  if (isImageModerationStandby()) {
    return {
      status: "APPROVED",
      provider: "standby",
      findings: [],
      raw: { reason: "IMAGE_MODERATION_STANDBY enabled", sha256: hash, fileName: input.fileName }
    };
  }

  const endpoint = imageModerationEndpoint();
  const apiKey = process.env.IMAGE_MODERATION_API_KEY || "";
  if (!endpoint) {
    return {
      status: "APPROVED",
      provider: "not_configured",
      findings: [],
      raw: { reason: "IMAGE_MODERATION_ENDPOINT not configured; standby approval used" }
    };
  }
  if (!apiKey) {
    return {
      status: "NEEDS_REVIEW",
      provider: "misconfigured",
      findings: [],
      raw: { reason: "IMAGE_MODERATION_API_KEY is required when a moderation endpoint is configured" }
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        fileName: input.fileName,
        mimeType: input.mimeType,
        sha256: hash,
        imageBase64: input.bytes.toString("base64"),
        requireOcr: true,
        policy: moderationPolicySummary()
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { status: "NEEDS_REVIEW", provider: "configured-ai", raw: { status: response.status, data } };
    }
    return { ...(data ?? {}), provider: data?.provider ?? "configured-ai", raw: data };
  } catch (error) {
    return {
      status: "NEEDS_REVIEW",
      provider: "configured-ai",
      raw: { error: error instanceof Error ? error.message : "provider_failed" }
    };
  }
}

function isImageModerationStandby() {
  return process.env.IMAGE_MODERATION_STANDBY !== "false";
}

function normalizeFindings(providerResult: ProviderResult) {
  const rawFindings = [...(providerResult.findings ?? []), ...(providerResult.categories ?? [])];
  return rawFindings
    .map((item) => ({
      category: normalizeCategory(item.category),
      confidence: normalizeConfidence(item.confidence),
      label: item.label
    }))
    .filter((item) => item.confidence > 0);
}

function normalizeCategory(value: string) {
  const text = normalizeText(value);
  if (/(adult|nudity|nude|sexual|porn|prostitution)/.test(text)) return "adult";
  if (/(child|minor|infantil|menor)/.test(text)) return "child_safety";
  if (/(violence|blood|gore|corpse|torture|mutilation)/.test(text)) return "violence";
  if (/(drug|cocaine|crack|maconha|cannabis|narcotic)/.test(text)) return "drugs";
  if (/(weapon|gun|firearm|ammo|munition|explosive)/.test(text)) return "weapons";
  if (/(document|cpf|rg|cnh|passport|bank|card|qr|fraud)/.test(text)) return "fraud_documents";
  if (/(crime|stolen|cyber|clone|hacking|personal_data)/.test(text)) return "criminal_activity";
  if (/(wildlife|animal|fauna|flora|hunting)/.test(text)) return "illegal_animals_environment";
  if (/(contraband|smuggling|illegal_import|medicine|cigarette)/.test(text)) return "contraband";
  if (/(person|people|face)/.test(text)) return "people";
  return "other";
}

function normalizeConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number > 1 ? Math.min(1, number / 100) : Math.max(0, Math.min(1, number));
}

function findBlockedOcrTerms(text: string, originProof = false) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const allowedOnPrivateProof = new Set(["rg", "cpf", "cnh", "passaporte", "comprovante bancario", "comprovante bancário", "comprovante pix", "qr code pix", "dados pessoais"]);
  return ocrBlockedTerms.filter((term) => !(originProof && allowedOnPrivateProof.has(term)) && normalized.includes(normalizeText(term))).slice(0, 20);
}

function imageModerationEndpoint() {
  if (process.env.IMAGE_MODERATION_ENDPOINT) return process.env.IMAGE_MODERATION_ENDPOINT;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl || process.env.IMAGE_MODERATION_SUPABASE_EDGE === "false") return "";
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/image-moderation`;
}

function signModerationPayload(encoded: string) {
  const secret = process.env.IMAGE_MODERATION_TOKEN_SECRET || process.env.JWT_SECRET || "acheix-local-image-moderation";
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function recordImageModeration(input: Omit<ModerationDecision, "token"> & {
  userId: string;
  url: string | null;
  storagePath: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  providerRaw: unknown;
  ip: string;
  userAgent: string;
}) {
  const metadata = {
    moderationId: input.moderationId,
    status: input.status,
    hash: input.hash,
    riskScore: input.riskScore,
    riskLevel: input.riskLevel,
    findings: redactFindings(input.findings),
    provider: input.provider,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    url: input.url,
    storagePath: input.storagePath,
    ip: input.ip,
    userAgent: input.userAgent
  };
  await tryInsertAudit(input.userId, `image_moderation.${input.status.toLowerCase()}`, metadata);

  const { error } = await db().from("ImageModerationLog").insert({
    id: input.moderationId,
    userId: input.userId,
    url: input.url,
    storagePath: input.storagePath,
    imageHash: input.hash,
    status: input.status,
    riskScore: input.riskScore,
    riskLevel: input.riskLevel,
    categories: input.findings,
    ocrText: input.ocrText.slice(0, 4000),
    provider: input.provider,
    providerRaw: input.providerRaw,
    ip: input.ip,
    userAgent: input.userAgent
  } as any);
  if (error) await tryInsertAudit(input.userId, "image_moderation.log_table_unavailable", { ...metadata, error: error.message });
}

async function tryUpdateImageModerationLog(id: string, values: Record<string, unknown>) {
  const { error } = await db().from("ImageModerationLog").update(values as any).eq("id", id);
  if (error) await tryInsertAudit(null, "image_moderation.log_update_failed", { id, values, error: error.message });
}

async function createImageTrustCase(userId: string, decision: Omit<ModerationDecision, "token">) {
  const now = new Date().toISOString();
  const { error } = await db().from("TrustCase").insert({
    id: newDbId(),
    targetType: "USER",
    targetUserId: userId,
    riskScore: Math.max(70, decision.riskScore),
    riskLevel: decision.riskLevel === "LOW" ? "HIGH" : decision.riskLevel,
    status: decision.status === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "PREVENTIVE_ACTION",
    requiresHumanReview: decision.status === "NEEDS_REVIEW",
    preventiveAction: "Imagem bloqueada pela moderação automática. Revisar reincidência e conteúdo.",
    updatedAt: now
  } as any);
  if (error) await tryInsertAudit(userId, "image_moderation.trust_case_failed", { moderationId: decision.moderationId, error: error.message });
}

async function applyImageRiskPolicy(userId: string) {
  const { count, error } = await db()
    .from("ImageModerationLog")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .in("status", ["REJECTED", "NEEDS_REVIEW"]);
  if (error) {
    await tryInsertAudit(userId, "image_moderation.risk_score_unavailable", { error: error.message });
    return;
  }

  const attempts = count ?? 0;
  const score = Math.min(300, attempts * 35);
  await tryInsertAudit(userId, "image_moderation.user_risk_score", { attempts, score });
  const { error: scoreError } = await db().from("User").update({ imageRiskScore: score } as any).eq("id", userId);
  if (scoreError) await tryInsertAudit(userId, "image_moderation.user_risk_score_update_skipped", { score, error: scoreError.message });
  if (score >= numberEnv("IMAGE_MODERATION_AUTO_BLOCK_SCORE", 140)) {
    const now = new Date().toISOString();
    const { error: blockError } = await db().from("User").update({
      accountBlockedAt: now,
      accountBlockedReason: "Bloqueio automático por reincidência no envio de imagens proibidas.",
      imageModerationBlockedAt: now,
      updatedAt: now
    } as any).eq("id", userId);
    if (blockError) await tryInsertAudit(userId, "image_moderation.auto_block_failed", { score, error: blockError.message });
    else await tryInsertAudit(userId, "image_moderation.auto_blocked_user", { score, attempts });
  }
}

async function tryInsertAudit(userId: string | null, action: string, metadata: Record<string, unknown>) {
  await db().from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
}

function redactFindings(findings: ProviderFinding[]) {
  return findings.map((item) => ({ category: item.category, confidence: item.confidence, label: item.label })).slice(0, 50);
}

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

function normalizeText(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function moderationPolicySummary() {
  return {
    reject: [
      "adult sexual content, nudity, semi-nudity, prostitution or sexual services",
      "child exploitation, child abuse, sexualized minors or minors in sensitive context",
      "extreme violence, excessive blood, gore, torture, corpses or mutilation",
      "illegal drugs, narcotics or equipment for illegal drug use or sale",
      "firearms, ammunition, explosives or weapons illegal under Brazilian law",
      "RG, CPF, CNH, passport, bank cards, financial receipts, suspicious QR codes, fraud or third-party documents",
      "stolen goods, cybercrime, sale of personal data, card/account cloning or illegal tools",
      "protected wildlife, illegal animal trade, illegal hunting products or illegal flora/fauna",
      "contraband, illegal medicines, illegal imports or products prohibited by Brazilian law"
    ],
    allow: [
      "people in normal non-sensitive context",
      "people in the background",
      "children in ordinary family context without exploitation, exposure or risk"
    ],
    ocr: true,
    responseFormat: "JSON with decision/status, findings/category/confidence and ocrText"
  };
}
