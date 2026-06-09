import { db, throwDbError } from "@/lib/supabase-db";

export type ListingCategory = "VEHICLE" | "REAL_ESTATE";
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "EXPIRED" | "SOLD" | "RENTED";

export type ListingRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ListingCategory;
  type: string;
  priceCents: number;
  city: string;
  state: string;
  district: string | null;
  status: ListingStatus;
  showPhone: boolean;
  showWhatsapp: boolean;
  searchText: string;
  viewCount: number;
  contactClickCount: number;
  shareCount: number;
  expiresAt: string | Date;
  createdAt: string | Date;
  updatedAt?: string | Date;
  ownerId: string;
  planId: string;
  photos: Array<{ id?: string; url: string; alt: string | null; order?: number }>;
  vehicle: any | null;
  realEstate: any | null;
  plan: { id: string; code: string; name: string; priceCents: number; durationDays: number; photoLimit: number; listingLimit: number } | null;
  owner: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    acceptedTermsAt: string | Date | null;
    identityVerifiedAt: string | Date | null;
    createdAt: string | Date;
    _count: { listings: number };
  } | null;
};

type ListingRow = Omit<ListingRecord, "photos" | "vehicle" | "realEstate" | "plan" | "owner">;

export function listingColumns() {
  return [
    "id", "slug", "title", "description", "category", "type", "priceCents", "city", "state", "district", "status",
    "showPhone", "showWhatsapp", "searchText", "viewCount", "contactClickCount", "shareCount", "expiresAt", "createdAt", "updatedAt", "ownerId", "planId"
  ].join(",");
}

const vehicleColumns = [
  "id", "listingId", "brand", "model", "version", "fipeCode", "year", "mileageKm", "color", "fuel", "gearbox"
].join(",");

const realEstateColumns = [
  "id", "listingId", "purpose", "bedrooms", "suites", "bathrooms", "parking", "areaM2", "features"
].join(",");

export async function hydrateListings(rows: ListingRow[]): Promise<ListingRecord[]> {
  if (!rows.length) return [];
  const listingIds = rows.map((row) => row.id);
  const planIds = [...new Set(rows.map((row) => row.planId).filter(Boolean))];
  const ownerIds = [...new Set(rows.map((row) => row.ownerId).filter(Boolean))];

  const [photosResult, vehiclesResult, realEstateResult, plansResult, ownersResult, ownerListingRowsResult] = await Promise.all([
    db().from("Photo").select("id,listingId,url,alt,order").in("listingId", listingIds).order("order", { ascending: true }),
    db().from("Vehicle").select(vehicleColumns).in("listingId", listingIds),
    db().from("RealEstate").select(realEstateColumns).in("listingId", listingIds),
    planIds.length ? db().from("Plan").select("id,code,name,priceCents,durationDays,photoLimit,listingLimit").in("id", planIds) : Promise.resolve({ data: [], error: null }),
    ownerIds.length ? db().from("User").select("id,name,city,state,acceptedTermsAt,identityVerifiedAt,createdAt").in("id", ownerIds) : Promise.resolve({ data: [], error: null }),
    ownerIds.length ? db().from("Listing").select("ownerId").in("ownerId", ownerIds).eq("status", "ACTIVE") : Promise.resolve({ data: [], error: null })
  ]);

  for (const result of [photosResult, vehiclesResult, realEstateResult, plansResult, ownersResult, ownerListingRowsResult]) {
    throwDbError(result.error);
  }

  const photosByListing = groupBy(photosResult.data ?? [], "listingId");
  const vehicleByListing = keyBy((vehiclesResult.data ?? []) as any[], "listingId");
  const realEstateByListing = keyBy((realEstateResult.data ?? []) as any[], "listingId");
  const planById = keyBy(plansResult.data ?? [], "id");
  const ownerById = keyBy(ownersResult.data ?? [], "id");
  const counts = new Map<string, number>();
  for (const item of (ownerListingRowsResult.data ?? []) as Array<{ ownerId: string }>) {
    counts.set(item.ownerId, (counts.get(item.ownerId) ?? 0) + 1);
  }

  return rows.map((row) => {
    const owner = ownerById.get(row.ownerId) ?? null;
    return {
      ...row,
      photos: photosByListing.get(row.id) ?? [],
      vehicle: vehicleByListing.get(row.id) ?? null,
      realEstate: realEstateByListing.get(row.id) ?? null,
      plan: planById.get(row.planId) ?? null,
      owner: owner ? { ...owner, _count: { listings: counts.get(row.ownerId) ?? 0 } } : null
    } as ListingRecord;
  });
}

export async function hydrateListingCards(rows: ListingRow[]): Promise<ListingRecord[]> {
  if (!rows.length) return [];
  const listingIds = rows.map((row) => row.id);
  const planIds = [...new Set(rows.map((row) => row.planId).filter(Boolean))];
  const ownerIds = [...new Set(rows.map((row) => row.ownerId).filter(Boolean))];

  const [photosResult, plansResult, ownersResult] = await Promise.all([
    db().from("Photo").select("id,listingId,url,alt,order").in("listingId", listingIds).order("order", { ascending: true }),
    planIds.length ? db().from("Plan").select("id,code,name,priceCents,durationDays,photoLimit,listingLimit").in("id", planIds) : Promise.resolve({ data: [], error: null }),
    ownerIds.length ? db().from("User").select("id,name,city,state,acceptedTermsAt,identityVerifiedAt,createdAt").in("id", ownerIds) : Promise.resolve({ data: [], error: null })
  ]);

  for (const result of [photosResult, plansResult, ownersResult]) {
    throwDbError(result.error);
  }

  const photosByListing = groupBy(photosResult.data ?? [], "listingId");
  const planById = keyBy(plansResult.data ?? [], "id");
  const ownerById = keyBy(ownersResult.data ?? [], "id");

  return rows.map((row) => {
    const owner = ownerById.get(row.ownerId) ?? null;
    return {
      ...row,
      photos: (photosByListing.get(row.id) ?? []).slice(0, 1),
      vehicle: null,
      realEstate: null,
      plan: planById.get(row.planId) ?? null,
      owner: owner ? { ...owner, _count: { listings: 0 } } : null
    } as ListingRecord;
  });
}

export async function findListingBySlug(slug: string) {
  const { data, error } = await db()
    .from("Listing")
    .select(listingColumns())
    .eq("slug", slug)
    .maybeSingle();
  throwDbError(error);
  const [listing] = await hydrateListings(data ? [data as unknown as ListingRow] : []);
  return listing ?? null;
}

function groupBy<T extends Record<string, any>>(items: T[], key: keyof T) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const value = String(item[key]);
    const current = grouped.get(value) ?? [];
    current.push(item);
    grouped.set(value, current);
  }
  return grouped;
}

function keyBy<T extends Record<string, any>>(items: T[], key: keyof T) {
  const keyed = new Map<string, T>();
  for (const item of items) keyed.set(String(item[key]), item);
  return keyed;
}

