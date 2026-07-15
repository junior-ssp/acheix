import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { validateCpfWithProviders } from "@/lib/cpf-validation";
import { canShareCpfBetween } from "@/lib/cpf-sharing-exceptions";
import { onlyDigits } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { analyzeIdentityDocumentImage } from "@/lib/image-moderation";
import { identityNameMatches, identityNameMismatchMessage } from "@/lib/identity-name-match";
import { createNotification } from "@/lib/notifications";
import { db, isUniqueViolation, newDbId, throwDbError, uniqueViolationFields } from "@/lib/supabase-db";
import { isValidCpf } from "@/lib/validators";

export const dynamic = "force-dynamic";

const adminReviewEmail = "junior.representacoes.br@gmail.com";
const maxFileSize = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.accountType !== "CPF") return json({ error: "Troca de CPF disponível apenas para conta Pessoa Física." }, 403);
    if (!user.cpf) return json({ error: "Seu cadastro ainda não tem CPF salvo. Atualize o CPF no perfil." }, 422);

    const formData = await request.formData();
    const requestedCpf = onlyDigits(String(formData.get("cpf") ?? ""));
    const documentFile = formData.get("document");
    const selfieFile = formData.get("selfie");

    if (!isValidCpf(requestedCpf)) return json({ error: "Informe um CPF válido." }, 422);
    if (requestedCpf === user.cpf) return json({ error: "O CPF informado é igual ao CPF atual." }, 422);
    if (!(documentFile instanceof File)) return json({ error: "Envie uma foto do RG com CPF ou CNH." }, 422);
    if (!(selfieFile instanceof File)) return json({ error: "Envie uma selfie pela câmera." }, 422);
    validateIdentityFile(documentFile, "documento");
    validateIdentityFile(selfieFile, "selfie");

    const { data: existingCpf, error: cpfError } = await db()
      .from("User")
      .select("id,email")
      .eq("cpf", requestedCpf)
      .neq("id", user.id);
    throwDbError(cpfError);
    const blockedDuplicate = (existingCpf ?? []).find((item) => !canShareCpfBetween(user.email, item.email));
    if (blockedDuplicate) return json({ error: "Este CPF já está cadastrado em outra conta." }, 409);

    const cpfValidation = await validateCpfWithProviders(requestedCpf);
    if (!cpfValidation.valid) return json({ error: cpfValidation.error ?? "Informe um CPF válido." }, 422);
    if (cpfValidation.name && !identityNameMatches(user.name, cpfValidation.name)) {
      return json({ error: identityNameMismatchMessage() }, 422);
    }

    const pending = await findPendingRequest(user.id);
    if (pending) return json({ error: "Você já tem uma solicitação de troca de CPF em análise." }, 409);

    const documentBytes = Buffer.from(await documentFile.arrayBuffer());
    const selfieBytes = Buffer.from(await selfieFile.arrayBuffer());
    const documentOcr = await analyzeIdentityDocumentImage({
      user,
      fileName: documentFile.name,
      mimeType: documentFile.type,
      bytes: documentBytes,
      request
    });
    const ocrCpfs = extractCpfs(documentOcr.ocrText);
    const ocrCpfMatched = ocrCpfs.length ? ocrCpfs.includes(requestedCpf) : null;

    const [documentUrl, selfieUrl] = await Promise.all([
      uploadPrivateIdentityFile(user.id, "document", documentFile, documentBytes),
      uploadPrivateIdentityFile(user.id, "selfie", selfieFile, selfieBytes)
    ]);

    const now = new Date().toISOString();
    const { data: changeRequest, error } = await db()
      .from("CpfChangeRequest")
      .insert({
        id: newDbId(),
        userId: user.id,
        currentCpf: user.cpf,
        requestedCpf,
        status: "PENDING_REVIEW",
        documentUrl,
        selfieUrl,
        documentOcrText: documentOcr.ocrText.slice(0, 8000),
        documentOcrProvider: documentOcr.provider,
        ocrCpfMatched,
        updatedAt: now
      })
      .select("id")
      .single();
    throwDbError(error);
    if (!changeRequest) return json({ error: "Não foi possível registrar a solicitação de CPF." }, 500);

    await notifyAdmin(changeRequest.id, user, requestedCpf, ocrCpfMatched);
    await createNotification(user.id, "Troca de CPF enviada", "Recebemos seu documento e selfie. O Admin irá analisar antes de alterar seu CPF.", {
      linkLabel: "Ver meus dados",
      linkUrl: "/dashboard#perfil"
    }).catch(() => null);

    return json({
      ok: true,
      requestId: changeRequest.id,
      message: "Solicitação enviada. Seu CPF atual será mantido até aprovação do Admin.",
      ocrCpfMatched
    }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const fields = uniqueViolationFields(error);
      if (fields.cpf) return json({ error: "Este CPF já está cadastrado em outra conta." }, 409);
      return json({ error: "Você já tem uma solicitação de troca de CPF em análise." }, 409);
    }
    return errorResponse(error);
  }
}

function validateIdentityFile(file: File, label: string) {
  if (!file.type.startsWith("image/")) throw new Error(`Envie uma imagem válida para ${label}.`);
  if (file.size > maxFileSize) throw new Error(`A imagem de ${label} deve ter até 12 MB.`);
}

async function findPendingRequest(userId: string) {
  const { data, error } = await db()
    .from("CpfChangeRequest")
    .select("id")
    .eq("userId", userId)
    .eq("status", "PENDING_REVIEW")
    .maybeSingle();
  if (isMissingCpfChangeRequestTable(error)) return null;
  throwDbError(error);
  return data;
}

async function uploadPrivateIdentityFile(userId: string, kind: "document" | "selfie", file: File, bytes: Buffer) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.REPORT_EVIDENCE_BUCKET || "report-evidence";
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Upload de identidade não configurado no servidor.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `identity-verification/${userId}/${kind}-${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    cacheControl: "86400",
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;
  return `supabase-private://report-evidence/${encodeURIComponent(path)}`;
}

async function notifyAdmin(requestId: string, user: { name: string; email: string }, requestedCpf: string, ocrCpfMatched: boolean | null) {
  const { data: admin, error } = await db()
    .from("User")
    .select("id")
    .eq("email", adminReviewEmail)
    .maybeSingle();
  throwDbError(error);
  if (!admin?.id) {
    await db().from("AuditLog").insert({
      id: newDbId(),
      userId: null,
      action: "cpf_change.admin_not_found",
      metadata: { requestId, adminReviewEmail, requesterEmail: user.email, requestedCpf }
    });
    return;
  }
  const ocrText = ocrCpfMatched === true ? "OCR encontrou o CPF informado." : ocrCpfMatched === false ? "OCR encontrou CPF diferente do informado." : "OCR não encontrou CPF com confiança.";
  await createNotification(admin.id, "CPF para analisar", `${user.name} (${user.email}) solicitou troca de CPF. ${ocrText}`, {
    primaryActionLabel: "Analisar CPF",
    primaryActionUrl: "/admin#cpf"
  });
}

function extractCpfs(text: string) {
  const candidates = new Set<string>();
  const normalized = String(text ?? "");
  const formatted = normalized.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g) ?? [];
  for (const value of formatted) {
    const digits = onlyDigits(value);
    if (isValidCpf(digits)) candidates.add(digits);
  }
  return [...candidates];
}

function isMissingCpfChangeRequestTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "42P01" || code === "PGRST205";
}
