import { getCurrentUser, requireAdmin, requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { buildSearchText } from "@/lib/listings";
import { findListingBySlug } from "@/lib/listing-records";
import { db, throwDbError } from "@/lib/supabase-db";
import { categories } from "@/lib/constants";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateListingSchema = z.object({
  title: z.string().min(8),
  description: z.string().trim().optional().default("").refine((value) => !hasPublicContactInText(value), publicContactDescriptionMessage),
  type: z.string().min(2),
  priceCents: z.number().int().nonnegative(),
  city: z.string().min(2),
  state: z.string().length(2),
  district: z.string().nullable().optional(),
  purpose: z.enum(["Venda", "Locação", "Temporada"]).optional()
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
      const { data: listing, error } = await supabase
        .from("Listing")
        .update({ status, updatedAt: new Date().toISOString() })
        .eq("slug", params.slug)
        .select("*")
        .single();
      throwDbError(error);
      return json({ listing });
    }

    const user = await requireUser();
    const listing = await findListingRow(params.slug, "id,ownerId,category");
    if (!listing) return json({ error: "Anúncio não encontrado" }, 404);
    if (listing.ownerId !== user.id && user.role !== "ADMIN") return json({ error: "Sem permissão" }, 403);

    const update = updateListingSchema.parse(data);
    const allowedTypes = listing.category === "VEHICLE" ? categories.VEHICLE : categories.REAL_ESTATE;
    if (!(allowedTypes as readonly string[]).includes(update.type)) {
      return json({ error: "Tipo de anúncio inválido para esta categoria." }, 422);
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("Listing")
      .update({
        title: update.title,
        description: update.description,
        type: update.type,
        priceCents: update.priceCents,
        city: update.city,
        state: update.state.toUpperCase(),
        district: update.district || null,
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
        .update({ purpose: update.purpose })
        .eq("listingId", listing.id);
      throwDbError(realEstateError);
    }

    return json({ listing: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const listing = await findListingRow(params.slug, "id,ownerId");
    if (!listing) return json({ error: "Anúncio não encontrado" }, 404);
    if (listing.ownerId !== user.id && user.role !== "ADMIN") return json({ error: "Sem permissão" }, 403);
    const { error } = await db().from("Listing").delete().eq("id", listing.id);
    throwDbError(error);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
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
