import { json } from "@/lib/http";
import { planCatalog } from "@/lib/constants";
import { withTimeout } from "@/lib/async";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

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
  const plans = existing.length
    ? existing.map((plan) => {
        const catalogPlan = catalogByCode.get(plan.code);
        return catalogPlan ? { ...plan, ...catalogPlan, id: plan.id, active: plan.active } : plan;
      })
    : planCatalog;
  return json({ plans });
}
