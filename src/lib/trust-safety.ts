type TrustReportReason =
  | "SCAM_ATTEMPT"
  | "FAKE_LISTING"
  | "NON_EXISTENT_PRODUCT"
  | "NON_EXISTENT_PROPERTY"
  | "SERVICE_NOT_DELIVERED"
  | "FAKE_DOCUMENT"
  | "SUSPICIOUS_PAYMENT"
  | "HARASSMENT_OR_THREAT"
  | "SPAM"
  | "INAPPROPRIATE_CONTENT"
  | "OTHER";

type Reporter = {
  createdAt: Date;
  identityVerifiedAt: Date | null;
  cpfVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
};

type ReportInput = {
  reason: TrustReportReason;
  hadDirectContact: boolean;
  hadFinancialLoss: boolean;
  hasEvidence: boolean;
  evidenceCount: number;
};

export function calculateReportCredibility(input: ReportInput, reporter: Reporter, validReporterReports: number, falseReportPenalty: number) {
  let score = 20;
  const accountAgeDays = Math.floor((Date.now() - reporter.createdAt.getTime()) / 86400000);
  if (accountAgeDays >= 30) score += 10;
  if (reporter.identityVerifiedAt || reporter.cpfVerifiedAt) score += 10;
  if (reporter.phoneVerifiedAt) score += 5;
  if (input.hadDirectContact) score += 20;
  if (input.hasEvidence) score += 20;
  if (input.evidenceCount >= 2) score += 10;
  if (validReporterReports > 0) score += Math.min(10, validReporterReports * 2);
  score -= falseReportPenalty;
  return clamp(score, 0, 100);
}

export function calculateReportRiskPoints(input: ReportInput) {
  let points = 10;
  if (input.reason === "SCAM_ATTEMPT" || input.reason === "FAKE_DOCUMENT" || input.reason === "SUSPICIOUS_PAYMENT") points = 100;
  if (input.reason === "INAPPROPRIATE_CONTENT") points = 80;
  if (input.reason === "FAKE_LISTING") points = 50;
  if (input.reason === "HARASSMENT_OR_THREAT") points = 30;
  if (input.reason === "NON_EXISTENT_PRODUCT" || input.reason === "NON_EXISTENT_PROPERTY") points = 20;
  if (input.hasEvidence) points += 5;
  if (input.hadFinancialLoss) points += 20;
  return clamp(points, 0, 100);
}

export function classifyRisk(score: number) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  if (score >= 20) return "LOW";
  return "VERY_LOW";
}

export function caseStatusForRisk(score: number, reason: TrustReportReason) {
  const requiresHumanReview = score >= 60 || ["SCAM_ATTEMPT", "FAKE_DOCUMENT", "SUSPICIOUS_PAYMENT"].includes(reason);
  const status = score >= 60 ? "NEEDS_REVIEW" : score >= 40 ? "MONITORING" : "OPEN";
  const preventiveAction = score >= 80
    ? "Bloqueio preventivo e ocultação devem ser avaliados por moderador."
    : score >= 60
      ? "Ocultar anúncios e bloquear novas publicações somente após revisão humana."
      : score >= 40
        ? "Reduzir exposição e solicitar validação adicional."
        : null;
  return { status, requiresHumanReview, preventiveAction };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}


