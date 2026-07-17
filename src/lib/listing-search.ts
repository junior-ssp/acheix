import { demoListings } from "@/lib/constants";
import { parseCurrencyToCents, parseFormattedInteger } from "@/lib/formatters";
import { db, throwDbError } from "@/lib/supabase-db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { orderAndRecordListingSearchExposure } from "@/lib/listing-search-exposure";
import { hydrateListingCards, hydrateListings, listingColumns, type ListingCategory, type ListingRecord } from "@/lib/listing-records";
import { seedListingOwnerEmail, seedListingMarker } from "@/lib/seed-listing-replacement";
import { shouldApplyTopRefreshBoost, topRefreshSearchBonus } from "@/lib/listing-top-refresh-policy";
import { normalizeRealEstatePurpose } from "@/lib/real-estate-taxonomy";
import { getCurrentUser } from "@/lib/auth";

export const ELECTRIC_OR_HYBRID_FUEL_FILTER = "ELECTRIC_OR_HYBRID";

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
  searched?: string;
  preferredState?: string;
  preferredCity?: string;
};

export async function findHomeListings(limit = 8) {
  if (!isSupabaseConfigured()) {
    return {
      vehicles: filterDemoListings({}, "VEHICLE").slice(0, limit) as unknown as ListingRecord[],
      realEstate: filterDemoListings({}, "REAL_ESTATE").slice(0, limit) as unknown as ListingRecord[],
      products: filterDemoListings({}, "PRODUCT").slice(0, limit) as unknown as ListingRecord[]
    };
  }

  return measureListingQuery("home", "ALL", async () => {
    const [vehicles, realEstate, products] = await Promise.all([
      safeHomeListingsByCategory("VEHICLE", limit),
      safeHomeListingsByCategory("REAL_ESTATE", limit),
      safeHomeListingsByCategory("PRODUCT", limit)
    ]);
    return { vehicles, realEstate, products };
  });
}

async function safeHomeListingsByCategory(category: ListingCategory, limit: number) {
  try {
    return await findHomeListingsByCategory(category, limit);
  } catch (error) {
    console.error("home_category_query_failed", {
      category,
      error: describeQueryError(error)
    });
    return [];
  }
}

async function findHomeListingsByCategory(category: ListingCategory, limit: number) {
  const fetchLimit = Math.max(limit * 2, 16);
  const { data, error } = await db()
    .from("Listing")
    .select(listingColumns())
    .eq("status", "ACTIVE")
    .eq("category", category)
    .not("searchText", "ilike", `%${seedListingMarker}%`)
    .order("lastTopRefreshAt", { ascending: false, nullsFirst: false })
    .order("createdAt", { ascending: false })
    .limit(fetchLimit);
  throwDbError(error);
  const hydrated = await hydrateListingCards((data ?? []) as any[]);
  const visible = sortByTopRefresh(hydrated.filter((listing) => !isSeedListing(listing))).slice(0, limit);
  if (visible.length >= limit) return visible;

  const fallback = await findHomeListingsFallback(category, limit - visible.length, visible.map((listing) => listing.id));
  return [...visible, ...fallback].slice(0, limit);
}

async function findHomeListingsFallback(category: ListingCategory, limit: number, excludedIds: string[]) {
  if (limit <= 0) return [];
  let query = db()
    .from("Listing")
    .select(listingColumns())
    .eq("status", "ACTIVE")
    .eq("category", category)
    .order("lastTopRefreshAt", { ascending: false, nullsFirst: false })
    .order("createdAt", { ascending: false })
    .limit(Math.max(limit * 2, limit));
  if (excludedIds.length) query = query.not("id", "in", `(${excludedIds.join(",")})`);
  const { data, error } = await query;
  throwDbError(error);
  return (await hydrateListingCards((data ?? []) as any[]))
    .sort((a, b) => {
      const aIsSeed = isSeedListing(a);
      const bIsSeed = isSeedListing(b);
      if (aIsSeed !== bIsSeed) return aIsSeed ? 1 : -1;
      return compareTopRefresh(b, a);
    })
    .slice(0, limit);
}

function isSeedListing(listing: ListingRecord) {
  return listing.owner?.email === seedListingOwnerEmail || String(listing.searchText ?? "").includes(seedListingMarker);
}

export async function findActiveListings(params: ListingSearchParams, forcedCategory?: ListingCategory) {
  const rankedParams = await withPreferredLocation(params);
  const q = normalizeText(params.q);
  const qTerms = q ? q.split(" ").filter((term) => term.length >= 2) : [];
  const category = forcedCategory ?? normalizeCategory(params.category);
  const min = normalizePrice(params.min);
  const max = normalizePrice(params.max);

  if (!isSupabaseConfigured()) return filterDemoListings(params, category);

  return measureListingQuery("search", category ?? "ALL", async () => {
    const nationalQuery = buildActiveListingSearchQuery(params, category, qTerms, min, max).limit(120);
    const shouldFetchPreferredState = !params.state && (!params.sort || params.sort === "relevance") && Boolean(rankedParams.preferredState);
    const regionalQuery = shouldFetchPreferredState
      ? buildActiveListingSearchQuery(params, category, qTerms, min, max, rankedParams.preferredState).limit(60)
      : null;
    const [nationalResult, regionalResult] = await Promise.all([nationalQuery, regionalQuery]);
    throwDbError(nationalResult.error);
    if (regionalResult) throwDbError(regionalResult.error);
    const rows = [...(regionalResult?.data ?? []), ...(nationalResult.data ?? [])];
    const uniqueRows = [...new Map(rows.map((row: any) => [row.id, row])).values()];
    const hydrated = await hydrateListings(uniqueRows as any[]);
    const listings = filterHydratedListings(hydrated, params, category);

    if (listings.length) return (await rankListings(listings, rankedParams, qTerms)).slice(0, 30);
    return [];
  });
}

function buildActiveListingSearchQuery(
  params: ListingSearchParams,
  category: ListingCategory | undefined,
  qTerms: string[],
  min: number | undefined,
  max: number | undefined,
  preferredState?: string
) {
  let query = db().from("Listing").select(listingColumns()).eq("status", "ACTIVE");
  if (category) query = query.eq("category", category);
  if (params.type) query = query.eq("type", params.type);
  if (params.state) query = query.eq("state", params.state.toUpperCase());
  else if (preferredState) query = query.eq("state", preferredState.toUpperCase());
  if (params.city) query = query.ilike("city", `%${params.city}%`);
  if (params.district) query = query.ilike("district", `%${params.district}%`);
  for (const term of qTerms) query = query.ilike("searchText", `%${term}%`);
  if (min !== undefined) query = query.gte("priceCents", min);
  if (max !== undefined) query = query.lte("priceCents", max);
  return applyListingOrder(query, params.sort);
}

async function withPreferredLocation(params: ListingSearchParams): Promise<ListingSearchParams> {
  if (params.preferredState || params.preferredCity) return params;
  if (params.state || params.city) {
    return { ...params, preferredState: params.state, preferredCity: params.city };
  }
  const user = await getCurrentUser().catch(() => null);
  return {
    ...params,
    preferredState: user?.state ?? undefined,
    preferredCity: user?.city ?? undefined
  };
}

async function measureListingQuery<T>(origin: "home" | "search", category: ListingCategory | "ALL", query: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    const result = await query();
    const durationMs = Date.now() - startedAt;
    if (durationMs > 2000) {
      console.warn("listing_query_slow", { origin, category, durationMs });
    }
    return result;
  } catch (error) {
    console.error("listing_query_failed", {
      origin,
      category,
      durationMs: Date.now() - startedAt,
      error: describeQueryError(error)
    });
    throw error;
  }
}

function describeQueryError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    return {
      code: value.code,
      message: value.message,
      details: value.details,
      hint: value.hint
    };
  }
  return String(error);
}
function normalizeCategory(category?: string): ListingCategory | undefined {
  if (category === "VEHICLE" || category === "REAL_ESTATE" || category === "PRODUCT") return category;
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
  return query.order("lastTopRefreshAt", { ascending: false, nullsFirst: false }).order("createdAt", { ascending: false });
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
      if (isElectricOrHybridFuelFilter(params.fuel) && !isElectricOrHybridListing(listing)) return false;
      if (params.fuel && !isElectricOrHybridFuelFilter(params.fuel) && !includesText(vehicle.fuel, params.fuel)) return false;
      if (params.gearbox && !includesText(vehicle.gearbox, params.gearbox)) return false;
      if (minYear !== undefined && Number(vehicle.year ?? 0) < minYear) return false;
      if (maxYear !== undefined && Number(vehicle.year ?? 0) > maxYear) return false;
      if (maxMileageKm !== undefined && Number(vehicle.mileageKm ?? 0) > maxMileageKm) return false;
    }

    if (category === "REAL_ESTATE") {
      const realEstate = listing.realEstate;
      const needsRealEstateDetails = Boolean(params.purpose || bedrooms !== undefined || bathrooms !== undefined || parking !== undefined || minAreaM2 !== undefined || maxAreaM2 !== undefined);
      if (!realEstate) return !needsRealEstateDetails;
      if (params.purpose && normalizeRealEstatePurpose(realEstate.purpose) !== normalizeRealEstatePurpose(params.purpose)) return false;
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

function isElectricOrHybridListing(listing: ListingRecord) {
  const haystack = [
    listing.type,
    listing.title,
    listing.searchText,
    listing.vehicle?.fuel,
    listing.vehicle?.brand,
    listing.vehicle?.model,
    listing.vehicle?.version
  ].join(" ");
  return isElectricOrHybridText(haystack);
}

function isElectricOrHybridFuelFilter(value?: string) {
  if (!value) return false;
  if (value === ELECTRIC_OR_HYBRID_FUEL_FILTER) return true;
  const text = normalizeText(value) ?? "";
  return text.includes("eletric") && text.includes("hibrid");
}

function isElectricOrHybridDemoListing(listing: (typeof demoListings)[number]) {
  return isElectricOrHybridText([listing.title, listing.type].join(" "));
}

function isElectricOrHybridText(value: string) {
  const text = normalizeText(value) ?? "";
  return text.includes("eletric") || text.includes("hibrid");
}

async function rankListings<T extends { id: string; ownerId?: string | null; title: string; type: string; city: string; state: string; district: string | null; searchText: string; createdAt: Date | string; lastTopRefreshAt?: Date | string | null; topRefreshBoostUntil?: Date | string | null }>(
  listings: T[],
  params: ListingSearchParams,
  qTerms: string[]
) {
  if (params.sort && params.sort !== "relevance") return listings;
  const relevanceScore = (listing: T) => scoreListing(listing, params, qTerms);

  return applyOwnerDiversity(await orderAndRecordListingSearchExposure(listings, relevanceScore));
}

function scoreListing(listing: { title: string; type: string; city: string; state: string; district: string | null; searchText: string; createdAt: Date | string; lastTopRefreshAt?: Date | string | null; topRefreshBoostUntil?: Date | string | null }, params: ListingSearchParams, qTerms: string[]) {
  const title = normalizeText(listing.title) ?? "";
  const type = normalizeText(listing.type) ?? "";
  const city = normalizeText(listing.city) ?? "";
  const district = normalizeText(listing.district ?? "") ?? "";
  const searchText = normalizeText(listing.searchText) ?? "";
  const wantedCity = normalizeText(params.city) ?? "";
  const wantedDistrict = normalizeText(params.district) ?? "";
  const preferredState = normalizeText(params.preferredState) ?? "";
  const preferredCity = normalizeText(params.preferredCity) ?? "";
  const state = normalizeText(listing.state) ?? "";

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
  if (preferredState && state === preferredState) score += 100;
  if (preferredCity && city === preferredCity && (!preferredState || state === preferredState)) score += 100;
  if (shouldApplyTopRefreshBoost(listing)) score += topRefreshSearchBonus;
  const freshnessDate = listing.lastTopRefreshAt ?? listing.createdAt;
  score += Math.max(0, 30 - Math.floor((Date.now() - new Date(freshnessDate).getTime()) / 86400000)) / 30;
  return score;
}

function sortByTopRefresh<T extends { createdAt: Date | string; lastTopRefreshAt?: Date | string | null; topRefreshBoostUntil?: Date | string | null }>(listings: T[]) {
  return [...listings].sort((left, right) => compareTopRefresh(right, left));
}

function compareTopRefresh(left: { createdAt: Date | string; lastTopRefreshAt?: Date | string | null; topRefreshBoostUntil?: Date | string | null }, right: { createdAt: Date | string; lastTopRefreshAt?: Date | string | null; topRefreshBoostUntil?: Date | string | null }) {
  const leftBoost = shouldApplyTopRefreshBoost(left) ? 1 : 0;
  const rightBoost = shouldApplyTopRefreshBoost(right) ? 1 : 0;
  if (leftBoost !== rightBoost) return leftBoost - rightBoost;
  const leftTop = sortableTime(left.lastTopRefreshAt ?? left.createdAt);
  const rightTop = sortableTime(right.lastTopRefreshAt ?? right.createdAt);
  if (leftTop !== rightTop) return leftTop - rightTop;
  return sortableTime(left.createdAt) - sortableTime(right.createdAt);
}

function sortableTime(value: Date | string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function applyOwnerDiversity<T extends { ownerId?: string | null }>(listings: T[]) {
  const result: T[] = [];
  const deferred: T[] = [];
  const ownerCounts = new Map<string, number>();

  for (const listing of listings) {
    const ownerId = listing.ownerId ?? "";
    const currentCount = ownerId ? ownerCounts.get(ownerId) ?? 0 : 0;
    const nextPosition = result.length + 1;
    const blockedTop10 = ownerId && nextPosition <= 10 && currentCount >= 1;
    const blockedTop30 = ownerId && nextPosition <= 30 && currentCount >= 3;

    if (blockedTop10 || blockedTop30) {
      deferred.push(listing);
      continue;
    }

    result.push(listing);
    if (ownerId) ownerCounts.set(ownerId, currentCount + 1);
  }

  for (const listing of deferred) {
    result.push(listing);
  }

  return result;
}

function filterDemoListings(params: ListingSearchParams, category?: ListingCategory) {
  const qTerms = (normalizeText(params.q) ?? "").split(" ").filter((term) => term.length >= 2);
  const min = normalizePrice(params.min);
  const max = normalizePrice(params.max);

  return demoListings.filter((listing) => {
    if (category && listing.category !== category) return false;
    if (params.type && listing.type !== params.type) return false;
    if (params.state && listing.state !== params.state.toUpperCase()) return false;
    if (params.city && !listing.city.toLowerCase().includes(params.city.toLowerCase())) return false;
    if (min !== undefined && listing.priceCents < min) return false;
    if (max !== undefined && listing.priceCents > max) return false;
    if (category === "VEHICLE" && params.brand && !includesText(`${listing.title} ${listing.type}`, params.brand)) return false;
    if (category === "VEHICLE" && isElectricOrHybridFuelFilter(params.fuel) && !isElectricOrHybridDemoListing(listing)) return false;
    if (category === "REAL_ESTATE" && params.purpose) {
      const demoPurpose = listing.priceCents <= 500000 ? "RENT" : "SALE";
      if (normalizeRealEstatePurpose(params.purpose) !== demoPurpose) return false;
    }
    if (!qTerms.length) return true;
    const haystack = [listing.title, listing.type, listing.city, listing.state]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return qTerms.every((term) => haystack.includes(term));
  }).sort((a, b) => scoreListing(b as any, params, qTerms) - scoreListing(a as any, params, qTerms));
}



