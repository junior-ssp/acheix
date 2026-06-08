import { demoListings } from "@/lib/constants";
import { withTimeout } from "@/lib/async";
import { parseCurrencyToCents, parseFormattedInteger } from "@/lib/formatters";
import { db, throwDbError } from "@/lib/supabase-db";
import { orderAndRecordListingSearchExposure } from "@/lib/listing-search-exposure";
import { hydrateListingCards, hydrateListings, listingColumns, type ListingCategory, type ListingRecord } from "@/lib/listing-records";

export type ListingSearchParams = {
  q?: string;
  category?: string;
  type?: string;
  state?: string;
  city?: string;
  district?: string;
  min?: string;
  max?: string;
  brand?: string;
  model?: string;
  version?: string;
  minYear?: string;
  maxYear?: string;
  color?: string;
  fuel?: string;
  gearbox?: string;
  maxMileageKm?: string;
  purpose?: string;
  bedrooms?: string;
  bathrooms?: string;
  parking?: string;
  minAreaM2?: string;
  maxAreaM2?: string;
  sort?: string;
};

export async function findHomeListings(limit = 8) {
  return withTimeout(
    (async () => {
      const [vehicles, realEstate] = await Promise.all([
        findHomeListingsByCategory("VEHICLE", limit),
        findHomeListingsByCategory("REAL_ESTATE", limit)
      ]);
      return { vehicles, realEstate };
    })(),
    { vehicles: [], realEstate: [] } as { vehicles: ListingRecord[]; realEstate: ListingRecord[] },
    1800
  );
}

async function findHomeListingsByCategory(category: ListingCategory, limit: number) {
  const { data, error } = await db()
    .from("Listing")
    .select(listingColumns())
    .eq("status", "ACTIVE")
    .eq("category", category)
    .order("createdAt", { ascending: false })
    .limit(limit);
  throwDbError(error);
  const hydrated = await hydrateListingCards((data ?? []) as any[]);
  return orderAndRecordListingSearchExposure(hydrated, () => 0);
}
export async function findActiveListings(params: ListingSearchParams, forcedCategory?: ListingCategory) {
  const q = normalizeText(params.q);
  const qTerms = q ? q.split(" ").filter((term) => term.length >= 2) : [];
  const category = forcedCategory ?? normalizeCategory(params.category);
  const min = normalizePrice(params.min);
  const max = normalizePrice(params.max);

  const listings = await withTimeout(
    (async () => {
      let query = db()
        .from("Listing")
        .select(listingColumns())
        .eq("status", "ACTIVE");

      if (category) query = query.eq("category", category);
      if (params.type) query = query.eq("type", params.type);
      if (params.state) query = query.eq("state", params.state.toUpperCase());
      if (params.city) query = query.ilike("city", `%${params.city}%`);
      if (params.district) query = query.ilike("district", `%${params.district}%`);
      for (const term of qTerms) query = query.ilike("searchText", `%${term}%`);
      if (min !== undefined) query = query.gte("priceCents", min);
      if (max !== undefined) query = query.lte("priceCents", max);
      query = applyListingOrder(query, params.sort).limit(60);

      const { data, error } = await query;
      throwDbError(error);
      const hydrated = await hydrateListings((data ?? []) as any[]);
      return filterHydratedListings(hydrated, params, category);
    })(),
    [],
    3500
  );

  if (listings.length) return (await rankListings(listings, params, qTerms)).slice(0, 30);
  return filterDemoListings(params, category);
}
function normalizeCategory(category?: string): ListingCategory | undefined {
  if (category === "VEHICLE" || category === "REAL_ESTATE") return category;
  return undefined;
}

function normalizePrice(value?: string) {
  if (!value) return undefined;
  const cents = parseCurrencyToCents(value);
  return cents > 0 ? cents : undefined;
}

function normalizeInt(value?: string) {
  if (!value) return undefined;
  const number = parseFormattedInteger(value);
  if (number === undefined) return undefined;
  if (!Number.isInteger(number) || number < 0) return undefined;
  return number;
}

function normalizeText(value?: string) {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function applyListingOrder(query: any, sort?: string) {
  if (sort === "price_asc") return query.order("priceCents", { ascending: true }).order("createdAt", { ascending: false });
  if (sort === "price_desc") return query.order("priceCents", { ascending: false }).order("createdAt", { ascending: false });
  if (sort === "expiring") return query.order("expiresAt", { ascending: true }).order("createdAt", { ascending: false });
  return query.order("createdAt", { ascending: false });
}

function filterHydratedListings(listings: ListingRecord[], params: ListingSearchParams, category?: ListingCategory) {
  const minYear = normalizeInt(params.minYear);
  const maxYear = normalizeInt(params.maxYear);
  const maxMileageKm = normalizeInt(params.maxMileageKm);
  const bedrooms = normalizeInt(params.bedrooms);
  const bathrooms = normalizeInt(params.bathrooms);
  const parking = normalizeInt(params.parking);
  const minAreaM2 = normalizeInt(params.minAreaM2);
  const maxAreaM2 = normalizeInt(params.maxAreaM2);

  return listings.filter((listing) => {
    if (category === "VEHICLE") {
      const vehicle = listing.vehicle;
      if (!vehicle) return false;
      if (params.brand && !includesText(vehicle.brand, params.brand)) return false;
      if (params.model && !includesText(vehicle.model, params.model)) return false;
      if (params.version && !includesText(vehicle.version, params.version)) return false;
      if (params.color && !includesText(vehicle.color, params.color)) return false;
      if (params.fuel && !includesText(vehicle.fuel, params.fuel)) return false;
      if (params.gearbox && !includesText(vehicle.gearbox, params.gearbox)) return false;
      if (minYear !== undefined && Number(vehicle.year ?? 0) < minYear) return false;
      if (maxYear !== undefined && Number(vehicle.year ?? 0) > maxYear) return false;
      if (maxMileageKm !== undefined && Number(vehicle.mileageKm ?? 0) > maxMileageKm) return false;
    }

    if (category === "REAL_ESTATE") {
      const realEstate = listing.realEstate;
      if (!realEstate) return false;
      if (params.purpose && realEstate.purpose !== params.purpose) return false;
      if (bedrooms !== undefined && Number(realEstate.bedrooms ?? 0) < bedrooms) return false;
      if (bathrooms !== undefined && Number(realEstate.bathrooms ?? 0) < bathrooms) return false;
      if (parking !== undefined && Number(realEstate.parking ?? 0) < parking) return false;
      if (minAreaM2 !== undefined && Number(realEstate.areaM2 ?? 0) < minAreaM2) return false;
      if (maxAreaM2 !== undefined && Number(realEstate.areaM2 ?? 0) > maxAreaM2) return false;
    }

    return true;
  });
}

function includesText(value: unknown, wanted: string) {
  return (normalizeText(String(value ?? "")) ?? "").includes(normalizeText(wanted) ?? "");
}

async function rankListings<T extends { id: string; title: string; type: string; city: string; state: string; district: string | null; searchText: string; createdAt: Date | string }>(
  listings: T[],
  params: ListingSearchParams,
  qTerms: string[]
) {
  if (params.sort && params.sort !== "relevance") return listings;
  const relevanceScore = (listing: T) => scoreListing(listing, params, qTerms);
  if (!qTerms.length && !params.city && !params.district) return orderAndRecordListingSearchExposure(listings, () => 0);

  return orderAndRecordListingSearchExposure(listings, relevanceScore);
}

function scoreListing(listing: { title: string; type: string; city: string; state: string; district: string | null; searchText: string; createdAt: Date | string }, params: ListingSearchParams, qTerms: string[]) {
  const title = normalizeText(listing.title) ?? "";
  const type = normalizeText(listing.type) ?? "";
  const city = normalizeText(listing.city) ?? "";
  const district = normalizeText(listing.district ?? "") ?? "";
  const searchText = normalizeText(listing.searchText) ?? "";
  const wantedCity = normalizeText(params.city) ?? "";
  const wantedDistrict = normalizeText(params.district) ?? "";

  let score = 0;
  for (const term of qTerms) {
    if (title.includes(term)) score += 8;
    if (type.includes(term)) score += 5;
    if (city.includes(term)) score += 4;
    if (district.includes(term)) score += 5;
    if (searchText.includes(term)) score += 1;
  }
  if (wantedCity && city.includes(wantedCity)) score += 10;
  if (wantedDistrict && district.includes(wantedDistrict)) score += 12;
  score += Math.max(0, 30 - Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / 86400000)) / 30;
  return score;
}

function filterDemoListings(params: ListingSearchParams, category?: ListingCategory) {
  const qTerms = (normalizeText(params.q) ?? "").split(" ").filter((term) => term.length >= 2);

  return demoListings.filter((listing) => {
    if (category && listing.category !== category) return false;
    if (params.type && listing.type !== params.type) return false;
    if (params.state && listing.state !== params.state.toUpperCase()) return false;
    if (params.city && !listing.city.toLowerCase().includes(params.city.toLowerCase())) return false;
    if (!qTerms.length) return true;
    const haystack = [listing.title, listing.type, listing.city, listing.state]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return qTerms.every((term) => haystack.includes(term));
  }).sort((a, b) => scoreListing(b as any, params, qTerms) - scoreListing(a as any, params, qTerms));
}



