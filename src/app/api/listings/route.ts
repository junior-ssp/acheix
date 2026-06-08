import { requireUser } from "@/lib/auth";
import { completeLocationFromUserAndDdd } from "@/lib/ddd-autocomplete";
import { addDays, freeListingCooldownDays, getListingDurationDays, recoveryDays } from "@/lib/expiration-policy";
import { errorResponse, json } from "@/lib/http";
import { buildSearchText, slugify } from "@/lib/listings";
import { findActiveListings } from "@/lib/listing-search";
import { findListingBySlug } from "@/lib/listing-records";
import { deliverUserNotice } from "@/lib/notifications";
import { isCnpjAccount, isProfessionalPlanCode } from "@/lib/plan-rules";
import { planCatalog } from "@/lib/constants";
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const listings = await findActiveListings(Object.fromEntries(url.searchParams.entries()));
  return json({ listings });
}

export async function POST(request: Request) {
  let createdListingId: string | null = null;

  try {
    const user = await requireUser();
    if (user.accountBlockedAt) {
      return json({ error: "Sua conta está bloqueada para publicar anúncios. Fale com o suporte do Achei X." }, 403);
    }

    const data = listingSchema.parse(await request.json());
    const { data: planData, error: planError } = await db()
      .from("Plan")
      .select("id,code,name,priceCents,durationDays,photoLimit,listingLimit")
      .eq("code", data.planCode)
      .maybeSingle();
    throwDbError(planError);
    const dbPlan = planData as PlanRow | null;
    const catalogPlan = planCatalog.find((item) => item.code === data.planCode);
    const plan = dbPlan && catalogPlan ? { ...dbPlan, ...catalogPlan, id: dbPlan.id } : dbPlan;
    if (!plan) return json({ error: "Plano não encontrado" }, 400);

    if (isProfessionalPlanCode(plan.code) && !isCnpjAccount(user)) {
      return json({ error: "Plano X Profissional é exclusivo para conta com CNPJ." }, 403);
    }
    if (data.photos.length > plan.photoLimit) return json({ error: `Limite de ${plan.photoLimit} fotos para o plano ${plan.name}` }, 422);

    const now = new Date();
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
    const expiresAt = addDays(now, durationDays);
    const location = await completeLocationFromUserAndDdd({ state: data.state, city: data.city, district: data.district }, { ...user, cep: user.cep });
    if (!location.state || !location.city) {
      return json({ error: "Informe Estado/Cidade, cadastre um CEP válido no perfil ou use um telefone com DDD válido para autocompletar a localização." }, 422);
    }

    const searchText = buildSearchText([
      data.title, data.description, data.type, location.city, location.state, location.district,
      data.vehicle && [data.vehicle.brand, data.vehicle.model, data.vehicle.version, data.vehicle.fipeCode, data.vehicle.year, data.vehicle.color, data.vehicle.fuel, data.vehicle.gearbox, data.vehicle.mileageKm],
      data.realEstate && [data.realEstate.purpose, data.realEstate.bedrooms, data.realEstate.suites, data.realEstate.bathrooms, data.realEstate.parking, data.realEstate.areaM2, data.realEstate.features]
    ]);

    const listingId = newDbId();
    const slug = `${slugify(data.title)}-${Date.now()}`;
    createdListingId = listingId;

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
      status: plan.priceCents > 0 ? "DRAFT" : "PENDING_REVIEW",
      showPhone: data.showPhone,
      showWhatsapp: data.showWhatsapp,
      searchText,
      expiresAt: expiresAt.toISOString(),
      termsAcceptedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ownerId: user.id,
      planId: plan.id
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

    if (plan.priceCents > 0) {
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
      startsAt: now.toISOString(),
      endsAt: expiresAt.toISOString()
    });
    throwDbError(subscriptionError);

    const listing = await findListingBySlug(slug);
    await deliverUserNotice(
      user,
      "Anúncio criado",
      `Seu anúncio "${data.title}" expira em ${durationDays} dias. Ele poderá ser renovado durante ${recoveryDays} dias após expirar antes da exclusão definitiva.`
    );

    return json({ listing }, 201);
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



