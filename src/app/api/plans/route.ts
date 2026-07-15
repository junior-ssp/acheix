import { json } from "@/lib/http";
import { planCatalog } from "@/lib/constants";
import { withTimeout } from "@/lib/async";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";
const catalogAuthoritativePlanCodes = new Set(["PRODUCT_MINI", "PRODUCT_START", "PRODUCT_BASIC"]);

export async function GET() {
  const existing = await withTimeout(
    (async () => {
      const { data, error } = await db().from("Plan").select("*").eq("active", true).order("priceCents", { ascending: true });
      throwDbError(error);
      return data ?? [];
    })(),
    [],
    1200
  );
  const catalogByCode = new Map(planCatalog.map((plan) => [plan.code, plan]));
  const existingCodes = new Set(existing.map((plan: any) => plan.code));
  const mergedExisting = existing.map((plan) => {
        const catalogPlan = catalogByCode.get(plan.code);
        if (!catalogPlan) return plan;
        if (catalogAuthoritativePlanCodes.has(plan.code)) return { ...plan, ...catalogPlan, id: plan.id, active: plan.active };
        return { ...catalogPlan, ...plan, id: plan.id, active: plan.active };
      });
  const missingCatalogPlans = planCatalog.filter((plan) => !existingCodes.has(plan.code));
  const plans = [...mergedExisting, ...missingCatalogPlans].sort((a: any, b: any) => Number(a.priceCents ?? 0) - Number(b.priceCents ?? 0));
  return json({ plans });
}
