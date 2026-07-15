import { buildSearchText } from "@/lib/listings";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const seedListingOwnerEmail = "curadoria.seed@acheix.com.br";
export const seedListingMarker = "acheix_seed_demo";

export function normalizeSeedText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function vehicleSeedKey(input: { brand?: unknown; model?: unknown }) {
  return `vehicle:${normalizeSeedText(input.brand)}:${normalizeSeedText(input.model)}`;
}

export function realEstateSeedKey(input: { type?: unknown; purpose?: unknown; city?: unknown }) {
  return `real-estate:${normalizeSeedText(input.type)}:${normalizeSeedText(input.purpose)}:${normalizeSeedText(input.city)}`;
}

export function seedSearchText(parts: Array<string | number | null | undefined | string[]>, seedKey: string, seedGroup: string) {
  return buildSearchText([...parts, seedListingMarker, `seedkey-${normalizeSeedText(seedKey)}`, `seedgroup-${normalizeSeedText(seedGroup)}`]);
}

export async function replaceSeedListingForRealListing(listingId: string) {
  const { data: listing, error: listingError } = await db()
    .from("Listing")
    .select("id,title,category,type,city,state,district,status,searchText,ownerId")
    .eq("id", listingId)
    .maybeSingle();
  throwDbError(listingError);
  if (!listing || String(listing.searchText ?? "").includes(seedListingMarker)) return null;

  const { data: owner, error: ownerError } = await db().from("User").select("id,email").eq("id", listing.ownerId).maybeSingle();
  throwDbError(ownerError);
  if (!owner || owner.email === seedListingOwnerEmail) return null;

  let seedKey: string | null = null;
  let seedGroup: string | null = null;

  if (listing.category === "VEHICLE") {
    const { data: vehicle, error } = await db().from("Vehicle").select("brand,model").eq("listingId", listing.id).maybeSingle();
    throwDbError(error);
    if (!vehicle) return null;
    seedKey = vehicleSeedKey(vehicle);
    seedGroup = `vehicle:${normalizeSeedText(listing.type)}:${normalizeSeedText(vehicle.brand)}`;
  }

  if (listing.category === "REAL_ESTATE") {
    const { data: realEstate, error } = await db().from("RealEstate").select("purpose").eq("listingId", listing.id).maybeSingle();
    throwDbError(error);
    if (!realEstate) return null;
    seedKey = realEstateSeedKey({ type: listing.type, purpose: realEstate.purpose, city: listing.city });
    seedGroup = `real-estate:${normalizeSeedText(listing.type)}:${normalizeSeedText(realEstate.purpose)}`;
  }

  if (!seedKey || !seedGroup) return null;

  const seedOwner = await findSeedOwner();
  if (!seedOwner) return null;

  const seed = await findActiveSeedByMarker(seedOwner.id, `seedkey-${normalizeSeedText(seedKey)}`)
    ?? await findActiveSeedByMarker(seedOwner.id, `seedgroup-${normalizeSeedText(seedGroup)}`);
  if (!seed) return null;

  const now = new Date().toISOString();
  const { error: deleteError } = await db()
    .from("Listing")
    .delete()
    .eq("id", seed.id)
    .eq("status", "ACTIVE");
  throwDbError(deleteError);

  const { error: auditError } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: owner.id,
    action: "seed_listing.replaced_by_real_listing",
    metadata: {
      realListingId: listing.id,
      realListingTitle: listing.title,
      seedListingId: seed.id,
      seedListingTitle: seed.title,
      seedKey,
      seedGroup,
      replacementMode: "deleted",
      replacedAt: now
    }
  });
  throwDbError(auditError);

  return seed;
}

async function findSeedOwner() {
  const { data, error } = await db().from("User").select("id,email").eq("email", seedListingOwnerEmail).maybeSingle();
  throwDbError(error);
  return data as { id: string; email: string } | null;
}

async function findActiveSeedByMarker(ownerId: string, marker: string) {
  const { data, error } = await db()
    .from("Listing")
    .select("id,title")
    .eq("ownerId", ownerId)
    .eq("status", "ACTIVE")
    .ilike("searchText", `%${marker}%`)
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return data as { id: string; title: string } | null;
}
