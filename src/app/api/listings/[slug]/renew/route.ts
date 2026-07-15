import { requireUser } from "@/lib/auth";
import { planCatalog } from "@/lib/constants";
import { errorResponse, json } from "@/lib/http";
import { getProductValuePlanId, isCnpjAccount, isPlanAllowedForCategory, isProfessionalPlanCode, isProductPlanAvailableForPrice, productPlanPriceRangeMessage } from "@/lib/plan-rules";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const renewalWindowDays = 7;
const renewSchema = z.object({
  planCode: z.enum(["PRODUCT_MINI", "PRODUCT_START", "PRODUCT_BASIC", "BRONZE", "SILVER", "GOLD", "X6", "X12"]),
  downgradeAccepted: z.boolean().optional().default(false)
});

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const data = renewSchema.parse(body);
    const supabase = db();
    const { data: listing, error: listingError } = await supabase
      .from("Listing")
      .select("id,ownerId,category,priceCents,planId,status,expiresAt")
      .eq("slug", params.slug)
      .maybeSingle();
    throwDbError(listingError);
    if (!listing || listing.ownerId !== user.id) return json({ error: "Anúncio não encontrado" }, 404);

    const daysLeft = daysUntilRenewal(listing.expiresAt);
    if (listing.status === "ACTIVE" && daysLeft > renewalWindowDays) {
      return json({
        error: `Seu plano ainda está ativo e faltam ${daysLeft} dias para vencer. Você receberá um alerta quando estiver próximo da renovação.`,
        renewalBlocked: true,
        daysLeft,
        renewalWindowDays
      }, 409);
    }

    const { data: dbPlan, error: planError } = await supabase
      .from("Plan")
      .select("id,code,name,priceCents,photoLimit,durationDays,listingLimit")
      .eq("code", data.planCode)
      .maybeSingle();
    throwDbError(planError);
    const catalogPlan = planCatalog.find((item) => item.code === data.planCode);
    const fallbackProductPlanId = getProductValuePlanId(data.planCode);
    const plan = dbPlan && catalogPlan ? { ...catalogPlan, ...dbPlan, id: dbPlan.id } : dbPlan ?? (catalogPlan && fallbackProductPlanId ? { ...catalogPlan, id: fallbackProductPlanId } : null);
    if (!plan) return json({ error: "Plano não encontrado" }, 400);
    if (isProfessionalPlanCode(plan.code) && !isCnpjAccount(user)) {
      return json({ error: "Plano X Profissional é exclusivo para conta com CNPJ." }, 403);
    }
    if (!isPlanAllowedForCategory(plan.code, listing.category as any)) {
      return json({ error: "Este plano é exclusivo para anúncios de produtos." }, 422);
    }
    if (listing.category === "PRODUCT" && !isProductPlanAvailableForPrice(plan.code, listing.priceCents ?? 0)) {
      return json({ error: productPlanPriceRangeMessage(plan.code) ?? "Escolha um plano compatível com o valor do produto." }, 422);
    }

    const { data: currentPlan, error: currentPlanError } = listing.planId
      ? await supabase
          .from("Plan")
          .select("id,code,name")
          .eq("id", listing.planId)
          .maybeSingle()
      : { data: null, error: null };
    throwDbError(currentPlanError);
    const isDowngrade = currentPlan ? planRank(plan.code) < planRank(currentPlan.code) : false;
    if (isDowngrade && currentPlan && !data.downgradeAccepted) {
      return json({
        error: `Você escolheu um plano inferior ao plano atual (${currentPlan.name} para ${plan.name}). Confirme em Entendi para continuar.`,
        requiresDowngradeAcceptance: true,
        currentPlan: { code: currentPlan.code, name: currentPlan.name },
        nextPlan: { code: plan.code, name: plan.name }
      }, 409);
    }

    const { count: photosCount, error: photosError } = await supabase
      .from("Photo")
      .select("id", { count: "exact", head: true })
      .eq("listingId", listing.id);
    throwDbError(photosError);
    if ((photosCount ?? 0) > plan.photoLimit) {
      return json({ error: `Este anúncio possui ${photosCount ?? 0} fotos. O plano ${plan.name} permite até ${plan.photoLimit}.` }, 422);
    }

    const { data: payment, error: paymentError } = await supabase
      .from("Payment")
      .insert({
        id: newDbId(),
        userId: user.id,
        amountCents: plan.priceCents,
        status: "PENDING",
        provider: "manual",
        providerRef: `renew:${listing.id}:${plan.code}:${Date.now()}`,
        updatedAt: new Date().toISOString()
      })
      .select("id,amountCents,status")
      .single();
    throwDbError(paymentError);
    if (!payment) return json({ error: "Não foi possível iniciar o pagamento." }, 500);

    if (isDowngrade && currentPlan) {
      const { error: auditError } = await supabase.from("AuditLog").insert({
        id: newDbId(),
        userId: user.id,
        action: "listing.plan_downgrade_accepted",
        metadata: {
          listingId: listing.id,
          paymentId: payment.id,
          currentPlanCode: currentPlan.code,
          currentPlanName: currentPlan.name,
          nextPlanCode: plan.code,
          nextPlanName: plan.name,
          acceptedAt: new Date().toISOString()
        }
      });
      throwDbError(auditError);
    }

    return json({
      payment,
      checkoutUrl: `/pagamento?paymentId=${payment.id}`
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function daysUntilRenewal(expiresAt: string | null | undefined) {
  if (!expiresAt) return 0;
  const expiresTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresTime)) return 0;
  return Math.ceil((expiresTime - Date.now()) / 86400000);
}

function planRank(code: string) {
  const ranks: Record<string, number> = {
    FREE: 0,
    PRODUCT_MINI: 1,
    PRODUCT_START: 2,
    PRODUCT_BASIC: 3,
    BRONZE: 4,
    SILVER: 5,
    GOLD: 6,
    X6: 7,
    X12: 8
  };
  return ranks[code] ?? 0;
}
