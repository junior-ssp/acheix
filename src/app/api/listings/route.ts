import { requireUser } from "@/lib/auth";
import { completeLocationFromUserAndDdd } from "@/lib/ddd-autocomplete";
import { addDays, freeListingCooldownDays, getListingDurationDays, pendingPaymentDraftDays, recoveryDays } from "@/lib/expiration-policy";
import { errorResponse, json } from "@/lib/http";
import { assertListingPhotosApproved } from "@/lib/image-moderation";
import { buildSearchText, slugify } from "@/lib/listings";
import { findActiveListings } from "@/lib/listing-search";
import { findListingBySlug } from "@/lib/listing-records";
import { listingTopRefreshActivationFields } from "@/lib/listing-top-refresh-policy";
import { deliverUserNotice } from "@/lib/notifications";
import { getProductValuePlanId, isCnpjAccount, isPlanAllowedForCategory, isProfessionalPlanCode, isProductPlanAvailableForPrice, productPlanPriceRangeMessage } from "@/lib/plan-rules";
import { isPlatformComplimentaryUser } from "@/lib/platform-complimentary-users";
import { planCatalog } from "@/lib/constants";
import { canAutoApproveProductListing } from "@/lib/product-auto-approval";
import { moderateProductListing } from "@/lib/product-intelligence";
import { replaceSeedListingForRealListing } from "@/lib/seed-listing-replacement";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { listingSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type PlanRow = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  durationDays: number;
  photoLimit: number;
  listingLimit: number;
};

type ActivePlanGrant = {
  id: string;
  newPlanId: string;
  startsAt: string;
  endsAt: string;
  affectedListingIds?: Array<string>;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const listings = await findActiveListings(Object.fromEntries(url.searchParams.entries()));
    return json({ listings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let createdListingId: string | null = null;

  try {
    const user = await requireUser();
    if (user.accountBlockedAt) {
      return json({ error: "Sua conta está bloqueada para publicar anúncios. Fale com o suporte do Achei X." }, 403);
    }
    const data = listingSchema.parse(await request.json());
    const now = new Date();
    const adminPlanGrant = await findActiveAdminPlanGrant(user.id, now);
    const { data: planData, error: planError } = await db()
      .from("Plan")
      .select("id,code,name,priceCents,durationDays,photoLimit,listingLimit")
      .eq(adminPlanGrant ? "id" : "code", adminPlanGrant?.newPlanId ?? data.planCode)
      .maybeSingle();
    throwDbError(planError);
    const dbPlan = planData as PlanRow | null;
    const catalogPlan = planCatalog.find((item) => item.code === (dbPlan?.code ?? data.planCode));
    const fallbackProductPlanId = getProductValuePlanId(data.planCode);
    const plan = dbPlan && catalogPlan ? { ...catalogPlan, ...dbPlan, id: dbPlan.id } : dbPlan ?? (catalogPlan && fallbackProductPlanId ? { ...catalogPlan, id: fallbackProductPlanId } : null);
    if (!plan) return json({ error: "Plano não encontrado" }, 400);

    const planProvidedByAdmin = Boolean(adminPlanGrant);
    if (isProfessionalPlanCode(plan.code) && !isCnpjAccount(user) && !planProvidedByAdmin) {
      return json({ error: "Plano X Profissional é exclusivo para conta com CNPJ." }, 403);
    }
    if (!isPlanAllowedForCategory(plan.code, data.category)) {
      return json({ error: "Este plano é exclusivo para anúncios de produtos." }, 422);
    }
    if (data.category === "PRODUCT" && plan.code === "FREE" && !planProvidedByAdmin) {
      return json({ error: "Produtos só podem ser publicados em planos pagos." }, 422);
    }
    if (data.category === "PRODUCT" && !isProductPlanAvailableForPrice(plan.code, data.priceCents)) {
      return json({ error: productPlanPriceRangeMessage(plan.code) ?? "Escolha um plano compatível com o valor do produto." }, 422);
    }
    if (data.photos.length > plan.photoLimit) return json({ error: `Limite de ${plan.photoLimit} fotos para o plano ${plan.name}` }, 422);
    const photoApproval = assertListingPhotosApproved(user.id, data.photos);
    if (!photoApproval.ok) return json({ error: photoApproval.error }, 422);
    const productModeration = data.category === "PRODUCT" && data.product ? moderateProductListing({
      title: data.title,
      description: data.description,
      category: data.product.productCategory,
      subcategory: data.product.subcategory,
      brand: data.product.brand,
      model: data.product.model,
      userRiskScore: (user as any).imageRiskScore
    }) : null;
    if (productModeration?.status === "BLOCKED") {
      await db().from("AuditLog").insert({
        id: newDbId(),
        userId: user.id,
        action: "product_moderation.blocked_before_publish",
        metadata: {
          title: data.title,
          category: data.product?.productCategory,
          subcategory: data.product?.subcategory,
          riskScore: productModeration.riskScore,
          reasons: productModeration.reasons
        }
      });
      return json({
        error: "Identificamos que este anúncio pode conter um produto incompatível com as Políticas de Publicação do Achei X.",
        code: "PRODUCT_BLOCKED_BY_POLICY",
        moderation: productModeration
      }, 422);
    }

    if (plan.priceCents > 0 && !planProvidedByAdmin) {
      const pendingDraft = await findRecentPendingPublishDraft({
        ownerId: user.id,
        title: data.title,
        category: data.category,
        type: data.type,
        priceCents: data.priceCents,
        planCode: plan.code,
        amountCents: plan.priceCents
      });
      if (pendingDraft) {
        const listing = await findListingBySlug(pendingDraft.slug);
        return json({ listing, payment: pendingDraft.payment, checkoutUrl: `/pagamento?paymentId=${pendingDraft.payment.id}`, reusedPendingDraft: true }, 200);
      }
    }

    if (plan.code === "FREE") {
      const since = addDays(now, -freeListingCooldownDays);
      const { count, error } = await db()
        .from("Listing")
        .select("id", { count: "exact", head: true })
        .eq("ownerId", user.id)
        .eq("category", data.category)
        .eq("planId", plan.id)
        .gte("createdAt", since.toISOString());
      throwDbError(error);
      if ((count ?? 0) > 0) {
        return json({ error: `Você já usou um anúncio grátis desta categoria nos últimos ${freeListingCooldownDays} dias.` }, 422);
      }
    }

    if (plan.listingLimit > 1) {
      const { count, error } = await db()
        .from("Listing")
        .select("id", { count: "exact", head: true })
        .eq("ownerId", user.id)
        .eq("planId", plan.id)
        .in("status", ["ACTIVE", "PENDING_REVIEW"])
        .gt("expiresAt", now.toISOString());
      throwDbError(error);
      if ((count ?? 0) >= plan.listingLimit) {
        return json({ error: `Seu ${plan.name} permite até ${plan.listingLimit} anúncios ativos.` }, 422);
      }
    }

    const durationDays = getListingDurationDays({ plan });
    const subscriptionStartsAt = adminPlanGrant ? new Date(adminPlanGrant.startsAt) : now;
    const expiresAt = adminPlanGrant ? new Date(adminPlanGrant.endsAt) : addDays(now, durationDays);
    // Location improves discovery, but it must never prevent a publication.
    // Complete it from the profile, CEP or DDD when possible and keep empty
    // strings when the user has no usable location data.
    const completedLocation = await completeLocationFromUserAndDdd(
      { state: data.state, city: data.city, district: data.district },
      { ...user, cep: user.cep }
    );
    const location = {
      state: String(completedLocation.state ?? "").toUpperCase(),
      city: String(completedLocation.city ?? ""),
      district: completedLocation.district || null
    };

    const searchText = buildSearchText([
      data.title, data.description, data.type, location.city, location.state, location.district,
      data.vehicle && [data.vehicle.brand, data.vehicle.model, data.vehicle.version, data.vehicle.fipeCode, data.vehicle.year, data.vehicle.color, data.vehicle.fuel, data.vehicle.gearbox, data.vehicle.mileageKm],
      data.realEstate && [data.realEstate.purpose, data.realEstate.bedrooms, data.realEstate.suites, data.realEstate.bathrooms, data.realEstate.parking, data.realEstate.areaM2, data.realEstate.features],
      data.product && [data.product.productCategory, data.product.subcategory, data.product.condition, data.product.brand, data.product.model]
    ]);

    const listingId = newDbId();
    const slug = `${slugify(data.title)}-${Date.now()}`;
    createdListingId = listingId;

    const complimentaryUser = isPlatformComplimentaryUser(user) || planProvidedByAdmin;
    const autoApproveProduct = data.category === "PRODUCT" && canAutoApproveProductListing(user);

    const initialStatus = plan.priceCents > 0 && !complimentaryUser ? "DRAFT" : data.category === "PRODUCT" && !autoApproveProduct ? "PENDING_REVIEW" : "ACTIVE";
    const listingExpiresAt = initialStatus === "DRAFT" ? addDays(now, pendingPaymentDraftDays) : expiresAt;
    const topRefreshFields = initialStatus === "ACTIVE" ? listingTopRefreshActivationFields(plan.code, now) : {};

    const { error: listingError } = await db().from("Listing").insert({
      id: listingId,
      slug,
      title: data.title,
      description: data.description,
      category: data.category,
      type: data.type,
      priceCents: data.priceCents,
      city: location.city,
      state: location.state,
      district: location.district ?? null,
      status: initialStatus,
      showPhone: Boolean(user.allowPublicPhone && data.showPhone),
      showWhatsapp: Boolean(user.allowPublicWhatsapp && data.showWhatsapp),
      showEmail: Boolean(user.allowPublicEmail && data.showEmail),
      retainChatAudit: data.retainChatAudit,
      searchText,
      expiresAt: listingExpiresAt.toISOString(),
      termsAcceptedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ownerId: user.id,
      planId: plan.id,
      ...topRefreshFields
    });
    throwDbError(listingError);

    if (data.photos.length) {
      const { error } = await db().from("Photo").insert(data.photos.map((photo, order) => ({ id: newDbId(), listingId, url: photo.url, alt: photo.alt ?? null, order })));
      throwDbError(error);
    }

    if (data.vehicle) {
      const { error } = await db().from("Vehicle").insert({ id: newDbId(), listingId, ...data.vehicle });
      throwDbError(error);
    }

    if (data.realEstate) {
      const { error } = await db().from("RealEstate").insert({ id: newDbId(), listingId, ...data.realEstate });
      throwDbError(error);
    }

    if (data.product) {
      const { error } = await db().from("Product").insert({
        id: newDbId(),
        listingId,
        productCategory: data.product.productCategory,
        subcategory: data.product.subcategory,
        condition: data.product.condition,
        brand: data.product.brand || null,
        model: data.product.model || null,
        serialOrImei: data.product.serialOrImei || null,
        originProofUrls: data.product.originProofUrls,
        originDeclarationAccepted: data.product.originDeclarationAccepted
      });
      throwDbError(error);
      await db().from("AuditLog").insert({
        id: newDbId(),
        userId: user.id,
        action: "product_moderation.evaluated",
        metadata: {
          listingId,
          status: productModeration?.status ?? "APPROVED",
          riskScore: productModeration?.riskScore ?? 0,
          reasons: productModeration?.reasons ?? []
        }
      });
    }

    if (plan.priceCents > 0 && !complimentaryUser) {
      const { data: payment, error: paymentError } = await db()
        .from("Payment")
        .insert({
          id: newDbId(),
          userId: user.id,
          amountCents: plan.priceCents,
          status: "PENDING",
          provider: "manual",
          providerRef: `publish:${listingId}:${plan.code}:${Date.now()}`,
          updatedAt: now.toISOString()
        })
        .select("id,amountCents,status")
        .single();
      throwDbError(paymentError);
      if (!payment) return json({ error: "Não foi possível iniciar o pagamento." }, 500);

      const listing = await findListingBySlug(slug);

      return json({ listing, payment, checkoutUrl: `/pagamento?paymentId=${payment.id}` }, 201);
    }

    const { error: subscriptionError } = await db().from("Subscription").insert({
      id: newDbId(),
      listingId,
      planId: plan.id,
      startsAt: subscriptionStartsAt.toISOString(),
      endsAt: expiresAt.toISOString()
    });
    throwDbError(subscriptionError);
    if (adminPlanGrant) await attachListingToAdminPlanGrant(adminPlanGrant, listingId);

    const listing = await findListingBySlug(slug);
    await replaceSeedListingForRealListing(listingId).catch((error) => console.error("seed_listing.replacement_failed", error));
    await deliverUserNotice(
      user,
      "Anúncio criado",
      `Seu anúncio "${data.title}" expira em ${durationDays} dias. Ele poderá ser renovado durante ${recoveryDays} dias após expirar antes da exclusão definitiva.`
    );

    return json({ listing, complimentaryPublication: plan.priceCents > 0 && complimentaryUser }, 201);
  } catch (error) {
    if (createdListingId) {
      try {
        await db().from("Listing").delete().eq("id", createdListingId);
      } catch {
        // rollback best-effort
      }
    }
    return errorResponse(error);
  }
}

async function findActiveAdminPlanGrant(userId: string, now: Date): Promise<ActivePlanGrant | null> {
  const { data, error } = await db()
    .from("AdminPlanGrant")
    .select("id,newPlanId,startsAt,endsAt,affectedListingIds")
    .eq("targetUserId", userId)
    .lte("startsAt", now.toISOString())
    .gt("endsAt", now.toISOString())
    .order("endsAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isMissingSupabaseRelation(error)) return null;
  throwDbError(error);
  return (data as ActivePlanGrant | null) ?? null;
}

async function attachListingToAdminPlanGrant(grant: ActivePlanGrant, listingId: string) {
  const affectedListingIds = Array.isArray(grant.affectedListingIds) ? grant.affectedListingIds : [];
  if (affectedListingIds.includes(listingId)) return;
  const { error } = await db()
    .from("AdminPlanGrant")
    .update({ affectedListingIds: [...affectedListingIds, listingId] })
    .eq("id", grant.id);
  if (isMissingSupabaseRelation(error)) return;
  throwDbError(error);
}

async function findRecentPendingPublishDraft(input: { ownerId: string; title: string; category: string; type: string; priceCents: number; planCode: string; amountCents: number }) {
  const since = addDays(new Date(), -1).toISOString();
  const { data: listings, error } = await db()
    .from("Listing")
    .select("id,slug,title")
    .eq("ownerId", input.ownerId)
    .eq("title", input.title)
    .eq("category", input.category)
    .eq("type", input.type)
    .eq("priceCents", input.priceCents)
    .eq("status", "DRAFT")
    .gte("createdAt", since)
    .order("createdAt", { ascending: false })
    .limit(5);
  throwDbError(error);

  for (const listing of (listings ?? []) as Array<{ id: string; slug: string; title: string }>) {
    const { data: payment, error: paymentError } = await db()
      .from("Payment")
      .select("id,amountCents,status")
      .eq("userId", input.ownerId)
      .eq("amountCents", input.amountCents)
      .eq("status", "PENDING")
      .like("providerRef", `publish:${listing.id}:${input.planCode}:%`)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwDbError(paymentError);
    if (payment) return { ...listing, payment };
  }
  return null;
}

function isMissingSupabaseRelation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "42P01" || code === "PGRST205";
}



