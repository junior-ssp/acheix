export function isProfessionalPlanCode(planCode?: string | null) {
  return planCode === "X6" || planCode === "X12";
}

export function isCnpjAccount(input: { accountType?: string | null; cnpj?: string | null }) {
  return input.accountType === "CNPJ" && Boolean(input.cnpj);
}
