export type ListingCategoryCode = "VEHICLE" | "REAL_ESTATE" | "PRODUCT";
export type ProductValuePlanCode = "PRODUCT_MINI" | "PRODUCT_START" | "PRODUCT_BASIC";

const productValuePlanRanges: Record<ProductValuePlanCode, { minCents: number; maxCents: number; label: string }> = {
  PRODUCT_MINI: { minCents: 0, maxCents: 3000, label: "até R$ 30,00" },
  PRODUCT_START: { minCents: 3001, maxCents: 5000, label: "de R$ 30,01 a R$ 50,00" },
  PRODUCT_BASIC: { minCents: 5001, maxCents: 10000, label: "de R$ 50,01 a R$ 100,00" }
};

const productValuePlanIds: Record<ProductValuePlanCode, string> = {
  PRODUCT_MINI: "plan_product_mini",
  PRODUCT_START: "plan_product_start",
  PRODUCT_BASIC: "plan_product_basic"
};

export function isProfessionalPlanCode(planCode?: string | null) {
  return planCode === "X6" || planCode === "X12";
}

export function isProductValuePlanCode(planCode?: string | null): planCode is ProductValuePlanCode {
  return planCode === "PRODUCT_MINI" || planCode === "PRODUCT_START" || planCode === "PRODUCT_BASIC";
}

export function isPlanAllowedForCategory(planCode: string | null | undefined, category: ListingCategoryCode) {
  if (category === "PRODUCT") return planCode === "PRODUCT_MINI" || planCode === "PRODUCT_START" || planCode === "PRODUCT_BASIC" || planCode === "BRONZE" || planCode === "SILVER" || planCode === "GOLD";
  if (isProductValuePlanCode(planCode)) return false;
  if (planCode === "FREE") return true;
  if (isProfessionalPlanCode(planCode)) return true;
  return true;
}

export function getProductValuePlanRange(planCode: string | null | undefined) {
  return isProductValuePlanCode(planCode) ? productValuePlanRanges[planCode] : null;
}

export function getProductValuePlanId(planCode: string | null | undefined) {
  return isProductValuePlanCode(planCode) ? productValuePlanIds[planCode] : null;
}

export function isProductPlanAvailableForPrice(planCode: string | null | undefined, productPriceCents: number) {
  const range = getProductValuePlanRange(planCode);
  if (!range) return true;
  return productPriceCents >= range.minCents && productPriceCents <= range.maxCents;
}

export function productPlanPriceRangeMessage(planCode: string | null | undefined) {
  const range = getProductValuePlanRange(planCode);
  return range ? `O plano escolhido é válido para produtos ${range.label}.` : null;
}

export function isCnpjAccount(input: { accountType?: string | null; cnpj?: string | null }) {
  return input.accountType === "CNPJ" && Boolean(input.cnpj);
}
