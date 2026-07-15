import { getCurrentUser, requireAdmin, requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { assertListingPhotosApproved } from "@/lib/image-moderation";
import { buildSearchText } from "@/lib/listings";
import { findListingBySlug } from "@/lib/listing-records";
import { listingTopRefreshActivationFields } from "@/lib/listing-top-refresh-policy";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { categories } from "@/lib/constants";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { allRealEstateTypes, isRealEstateTypeAllowed, normalizeRealEstatePurpose } from "@/lib/real-estate-taxonomy";

export const dynamic = "force-dynamic";

const legacyProductCategories = ["Beleza e Saúde"] as const;

const updateListingSchema = z.object({
  title: z.string().min(8),
  description: z.string().trim().optional().default("").refine((value) => !hasPublicContactInText(value), publicContactDescriptionMessage),
  type: z.string().min(2),
  priceCents: z.number().int().nonnegative(),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  district: z.string().nullable().optional(),
  showPhone: z.boolean().default(false),
  showWhatsapp: z.boolean().default(false),
  showEmail: z.boolean().default(false),
  retainChatAudit: z.boolean().default(true),
  purpose: z.enum(["SALE", "RENT", "SEASON"]).optional(),
  maxGuests: z.number().int().positive().optional(),
  photos: z.array(z.object({
    url: z.string().url(),
    alt: z.string().trim().nullable().optional(),
    moderationToken: z.string().optional()
  })).optional()
});

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  const supabase = db();
  const { error } = await supabase.rpc("increment_listing_view", { listing_slug: params.slug });
  if (error) {
    const current = await findListingRow(params.slug);
    if (current) {
      const { error: updateError } = await supabase
        .from("Listing")
        .update({ viewCount: (current.viewCount ?? 0) + 1, updatedAt: new Date().toISOString() })
        .eq("id", current.id);
      throwDbError(updateError);
    }
  }
  const listing = await findListingBySlug(params.slug);
  if (!listing) return json({ error: "Anúncio não encontrado" }, 404);
  return json({ listing, canSeeContact: Boolean(user) });
}

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  try {
    const data = await request.json();
    const supabase = db();
    if (data.status && Object.keys(data).length === 1) {
      await requireAdmin();
      const status = data.status;
      if (!["ACTIVE", "REJECTED", "EXPIRED", "PENDING_REVIEW", "SOLD", "RENTED"].includes(status)) {
        return json({ error: "Status inválido" }, 422);
      }
      const now = new Date();
      const currentListing = status === "ACTIVE" ? await findListingRow(params.slug, "id,planId,status") : null;
      const currentPlan = currentListing?.planId ? await findListingPlan(currentListing.planId) : null;
      const topRefreshFields = status === "ACTIVE" && currentPlan ? listingTopRefreshActivationFields(currentPlan.code, now) : {};
      const { data: listing, error } = await supabase
        .from("Listing")
        .update({ status, updatedAt: now.toISOString(), ...topRefreshFields })
        .eq("slug", params.slug)
        .select("*")
        .single();
      throwDbError(error);
      return json({ listing });
    }

    const user = await requireUser();
    const listing = await findListingRow(params.slug, "id,ownerId,category,planId");
    if (!listing) return json({ error: "Anúncio não encontrado" }, 404);
    if (listing.ownerId !== user.id && user.role !== "ADMIN") return json({ error: "Sem permissão" }, 403);

    const update = updateListingSchema.parse(data);
    const allowedTypes = listing.category === "VEHICLE" ? categories.VEHICLE : listing.category === "PRODUCT" ? [...categories.PRODUCT, ...legacyProductCategories] : allRealEstateTypes;
    if (!(allowedTypes as readonly string[]).includes(update.type)) {
      return json({ error: "Tipo de anúncio inválido para esta categoria." }, 422);
    }
    if (listing.category === "REAL_ESTATE" && update.purpose && !isRealEstateTypeAllowed(update.purpose, update.type)) {
      return json({ error: "Tipo de imóvel incompatível com a finalidade selecionada." }, 422);
    }
    const [currentPhotos, plan] = await Promise.all([
      findListingPhotos(listing.id),
      findListingPlan(listing.planId)
    ]);
    if (update.photos && plan && update.photos.length > plan.photoLimit) {
      return json({ error: `Limite de ${plan.photoLimit} fotos para o plano ${plan.name}` }, 422);
    }
    if (update.photos) {
      const currentPhotoUrls = new Set(currentPhotos.map((photo) => photo.url));
      const newPhotos = update.photos.filter((photo) => !currentPhotoUrls.has(photo.url));
      if (newPhotos.some((photo) => !photo.moderationToken)) {
        return json({ error: "Envie a foto pelo botão de upload antes de salvar o anúncio." }, 422);
      }
      const photoApproval = assertListingPhotosApproved(user.id, newPhotos);
      if (!photoApproval.ok) return json({ error: photoApproval.error }, 422);
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("Listing")
      .update({
        title: update.title,
        description: update.description,
        type: update.type,
        priceCents: update.priceCents,
        city: update.city ?? "",
        state: String(update.state ?? "").toUpperCase(),
        district: update.district || null,
        showPhone: Boolean(user.allowPublicPhone && update.showPhone),
        showWhatsapp: Boolean(user.allowPublicWhatsapp && update.showWhatsapp),
        showEmail: Boolean(user.allowPublicEmail && update.showEmail),
        retainChatAudit: update.retainChatAudit,
        searchText: buildSearchText([update.title, update.description, update.type, update.purpose, update.city, update.state, update.district]),
        updatedAt: now
      })
      .eq("id", listing.id)
      .select("*")
      .single();
    throwDbError(updateError);

    if (listing.category === "REAL_ESTATE" && update.purpose) {
      const { error: realEstateError } = await supabase
        .from("RealEstate")
        .update({ purpose: normalizeRealEstatePurpose(update.purpose), maxGuests: update.purpose === "SEASON" ? update.maxGuests ?? null : null })
        .eq("listingId", listing.id);
      throwDbError(realEstateError);
    }

    if (update.photos) {
      const { error: deletePhotosError } = await supabase.from("Photo").delete().eq("listingId", listing.id);
      throwDbError(deletePhotosError);
      if (update.photos.length) {
        const { error: insertPhotosError } = await supabase.from("Photo").insert(update.photos.map((photo, order) => ({
          id: newDbId(),
          listingId: listing.id,
          url: photo.url,
          alt: photo.alt ?? update.title,
          order
        })));
        throwDbError(insertPhotosError);
      }
    }

    revalidateEditedListingPaths(params.slug, listing.category);

    return json({ listing: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const listing = await findListingRow(params.slug, "id,ownerId,retainChatAudit");
    if (!listing) return json({ error: "Anúncio não encontrado" }, 404);
    if (listing.ownerId !== user.id && user.role !== "ADMIN") return json({ error: "Sem permissão" }, 403);
    await clearListingChats(listing.id, Boolean(listing.retainChatAudit), user.id);
    const { error } = await db().from("Listing").delete().eq("id", listing.id);
    throwDbError(error);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

async function clearListingChats(listingId: string, retainAudit: boolean, actorUserId: string) {
  const { data: conversations, error } = await db()
    .from("ListingChatConversation")
    .select("id,ownerId,interestedUserId,status,createdAt,updatedAt")
    .eq("listingId", listingId);
  throwDbError(error);
  if (!conversations?.length) return;

  const conversationIds = conversations.map((item: any) => item.id);
  if (retainAudit) {
    const now = new Date().toISOString();
    const { error: auditError } = await db().from("AuditLog").insert(conversations.map((conversation: any) => ({
      id: newDbId(),
      userId: actorUserId,
      action: "listing_chat.content_cleared",
      metadata: {
        listingId,
        conversationId: conversation.id,
        ownerId: conversation.ownerId,
        interestedUserId: conversation.interestedUserId,
        status: conversation.status,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        clearedAt: now,
        reason: "listing_deleted"
      }
    })));
    throwDbError(auditError);
  }

  const { error: messagesError } = await db().from("ListingChatMessage").delete().in("conversationId", conversationIds);
  throwDbError(messagesError);
  const { error: conversationsError } = await db().from("ListingChatConversation").delete().in("id", conversationIds);
  throwDbError(conversationsError);
}

async function findListingRow(slug: string, columns = "id,ownerId,category,viewCount") {
  const { data, error } = await db()
    .from("Listing")
    .select(columns)
    .eq("slug", slug)
    .maybeSingle();
  throwDbError(error);
  return data as any;
}

async function findListingPhotos(listingId: string) {
  const { data, error } = await db()
    .from("Photo")
    .select("url")
    .eq("listingId", listingId);
  throwDbError(error);
  return (data ?? []) as Array<{ url: string }>;
}

async function findListingPlan(planId: string | null) {
  if (!planId) return null;
  const { data, error } = await db()
    .from("Plan")
    .select("code,name,photoLimit")
    .eq("id", planId)
    .maybeSingle();
  throwDbError(error);
  return data as { code: string; name: string; photoLimit: number } | null;
}

function revalidateEditedListingPaths(slug: string, category: string) {
  revalidatePath(`/anuncios/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meus-anuncios");
  revalidatePath("/");
  revalidatePath("/buscar");
  if (category === "VEHICLE") revalidatePath("/veiculos");
  if (category === "REAL_ESTATE") revalidatePath("/imoveis");
  if (category === "PRODUCT") revalidatePath("/produtos");
}
