import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { calculateReportCredibility, calculateReportRiskPoints, caseStatusForRisk, classifyRisk } from "@/lib/trust-safety";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  publicReason: z.enum(["FRAUD_SUSPECT", "MISLEADING_INFO", "PROHIBITED_CONTENT", "BAD_USER_BEHAVIOR", "NON_EXISTENT_ADVERTISER"]).optional(),
  reason: z.enum([
    "SCAM_ATTEMPT",
    "FAKE_LISTING",
    "NON_EXISTENT_PRODUCT",
    "NON_EXISTENT_PROPERTY",
    "SERVICE_NOT_DELIVERED",
    "FAKE_DOCUMENT",
    "SUSPICIOUS_PAYMENT",
    "HARASSMENT_OR_THREAT",
    "SPAM",
    "INAPPROPRIATE_CONTENT",
    "OTHER"
  ]),
  hadDirectContact: z.boolean().default(false),
  contactLocation: z.enum(["IN_APP", "OUTSIDE_APP", "BOTH"]).default("IN_APP"),
  hadFinancialLoss: z.boolean().default(false),
  approximateLossCents: z.number().int().nonnegative().optional(),
  evidenceUrls: z.array(z.string().url()).max(10).default([]),
  description: z.string().trim().min(10).max(3000)
});

const publicReasonLabels: Record<string, string> = {
  FRAUD_SUSPECT: "Suspeita de Golpe ou Fraude",
  MISLEADING_INFO: "Anúncio Enganoso ou Informações Falsas",
  PROHIBITED_CONTENT: "Conteúdo Proibido ou Irregular",
  BAD_USER_BEHAVIOR: "Comportamento Inadequado do Usuário",
  NON_EXISTENT_ADVERTISER: "Anunciante ou Prestador de Serviços Inexistente"
};

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const reporter = await requireUser();
    const data = reportSchema.parse(await request.json().catch(() => ({})));
    const supabase = db();
    const { data: listing, error: listingError } = await supabase
      .from("Listing")
      .select("id,title,ownerId")
      .eq("slug", params.slug)
      .maybeSingle();
    throwDbError(listingError);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);
    if (listing.ownerId === reporter.id) return json({ error: "Você não pode reportar seu próprio anúncio." }, 422);

    const { data: reporterAccount, error: reporterError } = await supabase
      .from("User")
      .select("createdAt,identityVerifiedAt,cpfVerifiedAt,phoneVerifiedAt")
      .eq("id", reporter.id)
      .single();
    throwDbError(reporterError);
    if (!reporterAccount) return json({ error: "Usuário não encontrado." }, 404);

    const [validReporterReports, falseReportPenalty] = await Promise.all([
      countResolvedReporterReports(reporter.id),
      countFalseReportPenalty(reporter.id)
    ]);

    const hasEvidence = data.evidenceUrls.length > 0;
    const credibilityScore = calculateReportCredibility(
      { reason: data.reason, hadDirectContact: data.hadDirectContact, hadFinancialLoss: data.hadFinancialLoss, hasEvidence, evidenceCount: data.evidenceUrls.length },
      {
        createdAt: new Date(reporterAccount.createdAt),
        identityVerifiedAt: reporterAccount.identityVerifiedAt ? new Date(reporterAccount.identityVerifiedAt) : null,
        cpfVerifiedAt: reporterAccount.cpfVerifiedAt ? new Date(reporterAccount.cpfVerifiedAt) : null,
        phoneVerifiedAt: reporterAccount.phoneVerifiedAt ? new Date(reporterAccount.phoneVerifiedAt) : null
      },
      validReporterReports,
      falseReportPenalty
    );
    const riskPoints = calculateReportRiskPoints({ reason: data.reason, hadDirectContact: data.hadDirectContact, hadFinancialLoss: data.hadFinancialLoss, hasEvidence, evidenceCount: data.evidenceUrls.length });

    const { data: existingCases, error: caseError } = await supabase
      .from("TrustCase")
      .select("*")
      .eq("targetType", "LISTING")
      .eq("listingId", listing.id)
      .neq("status", "RESOLVED")
      .order("updatedAt", { ascending: false })
      .limit(1);
    throwDbError(caseError);
    const existingCase = existingCases?.[0] ?? null;
    const previousReports = existingCase ? await countReportsByCase(existingCase.id) : 0;
    const riskScore = Math.min(300, riskPoints + Math.max(0, previousReports - 1) * 10 + Math.round(credibilityScore / 10));
    const riskLevel = classifyRisk(riskScore);
    const casePolicy = caseStatusForRisk(riskScore, data.reason);
    const now = new Date().toISOString();

    const trustCase = existingCase
      ? await updateTrustCase(existingCase.id, { riskScore, riskLevel, status: casePolicy.status, requiresHumanReview: casePolicy.requiresHumanReview, preventiveAction: casePolicy.preventiveAction, updatedAt: now })
      : await createTrustCase({ id: newDbId(), targetType: "LISTING", listingId: listing.id, targetUserId: listing.ownerId, riskScore, riskLevel, status: casePolicy.status, requiresHumanReview: casePolicy.requiresHumanReview, preventiveAction: casePolicy.preventiveAction, updatedAt: now });

    const publicReasonLabel = data.publicReason ? publicReasonLabels[data.publicReason] : null;
    const description = publicReasonLabel ? `[${publicReasonLabel}] ${data.description}` : data.description;

    const { data: report, error: reportError } = await supabase.from("TrustReport").insert({
      id: newDbId(),
      reporterId: reporter.id,
      targetType: "LISTING",
      targetUserId: listing.ownerId,
      listingId: listing.id,
      reason: data.reason,
      hadDirectContact: data.hadDirectContact,
      contactLocation: data.contactLocation,
      hadFinancialLoss: data.hadFinancialLoss,
      approximateLossCents: data.approximateLossCents,
      hasEvidence,
      evidenceUrls: data.evidenceUrls,
      description,
      credibilityScore,
      riskPoints,
      caseId: trustCase.id
    }).select("id").single();
    throwDbError(reportError);

    const { error: auditError } = await supabase.from("AuditLog").insert({
      id: newDbId(),
      userId: reporter.id,
      action: "trust.report.created",
      metadata: { reportId: report?.id, caseId: trustCase.id, listingId: listing.id, riskScore, riskLevel, credibilityScore }
    });
    throwDbError(auditError);

    return json({ ok: true, caseId: trustCase.id, riskScore, riskLevel, requiresHumanReview: trustCase.requiresHumanReview });
  } catch (error) {
    return errorResponse(error);
  }
}

async function countResolvedReporterReports(reporterId: string) {
  const { data, error } = await db().from("TrustReport").select("caseId").eq("reporterId", reporterId).not("caseId", "is", null);
  throwDbError(error);
  const caseIds = [...new Set(((data ?? []) as Array<{ caseId: string | null }>).map((item) => item.caseId).filter(Boolean) as string[])];
  if (!caseIds.length) return 0;
  const { count, error: countError } = await db().from("TrustCase").select("id", { count: "exact", head: true }).in("id", caseIds).eq("status", "RESOLVED");
  throwDbError(countError);
  return count ?? 0;
}

async function countFalseReportPenalty(reporterId: string) {
  const { data, error } = await db().from("TrustReport").select("caseId").eq("reporterId", reporterId).not("caseId", "is", null);
  throwDbError(error);
  const caseIds = [...new Set(((data ?? []) as Array<{ caseId: string | null }>).map((item) => item.caseId).filter(Boolean) as string[])];
  if (!caseIds.length) return 0;
  const { count, error: countError } = await db().from("TrustDecision").select("id", { count: "exact", head: true }).in("caseId", caseIds).eq("action", "FALSE_REPORT");
  throwDbError(countError);
  return (count ?? 0) * 30;
}

async function countReportsByCase(caseId: string) {
  const { count, error } = await db().from("TrustReport").select("id", { count: "exact", head: true }).eq("caseId", caseId);
  throwDbError(error);
  return count ?? 0;
}

async function updateTrustCase(id: string, values: Record<string, unknown>) {
  const { data, error } = await db().from("TrustCase").update(values).eq("id", id).select("*").single();
  throwDbError(error);
  return data as any;
}

async function createTrustCase(values: Record<string, unknown>) {
  const { data, error } = await db().from("TrustCase").insert(values).select("*").single();
  throwDbError(error);
  return data as any;
}
