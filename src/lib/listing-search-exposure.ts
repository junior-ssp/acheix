import { db, newDbId, throwDbError } from "@/lib/supabase-db";

type ListingSearchItem = {
  id: string;
};

type ListingExposure = {
  impressions: number;
  lastSeenAt: string | null;
};

export async function orderAndRecordListingSearchExposure<T extends ListingSearchItem>(
  listings: T[],
  relevanceScore: (listing: T) => number
) {
  if (!listings.length) return listings;

  const exposureById = await loadRecentListingExposure();
  const tieBreakers = new Map(listings.map((listing) => [listing.id, Math.random()]));
  const ordered = [...listings].sort((left, right) => {
    const leftScore = relevanceScore(left);
    const rightScore = relevanceScore(right);
    const scoreDiff = rightScore - leftScore;
    if (Math.abs(scoreDiff) >= 1) return scoreDiff;

    const leftExposure = exposureById.get(left.id) ?? { impressions: 0, lastSeenAt: null };
    const rightExposure = exposureById.get(right.id) ?? { impressions: 0, lastSeenAt: null };
    if (leftExposure.impressions !== rightExposure.impressions) {
      return leftExposure.impressions - rightExposure.impressions;
    }

    const leftLast = lastSeenMs(leftExposure.lastSeenAt);
    const rightLast = lastSeenMs(rightExposure.lastSeenAt);
    if (leftLast !== rightLast) return leftLast - rightLast;

    return (tieBreakers.get(left.id) ?? 0) - (tieBreakers.get(right.id) ?? 0);
  });

  await recordListingSearchImpressions(ordered);
  return ordered;
}

async function loadRecentListingExposure() {
  const { data, error } = await db()
    .from("AuditLog")
    .select("createdAt,metadata")
    .eq("action", "listing.search_impressions.recorded")
    .order("createdAt", { ascending: false })
    .limit(300);
  throwDbError(error);

  const exposureById = new Map<string, ListingExposure>();
  for (const row of data ?? []) {
    const ids = Array.isArray(row.metadata?.listingIds) ? row.metadata.listingIds : [];
    for (const id of ids) {
      if (typeof id !== "string") continue;
      const current = exposureById.get(id) ?? { impressions: 0, lastSeenAt: null };
      exposureById.set(id, {
        impressions: current.impressions + 1,
        lastSeenAt: current.lastSeenAt ?? row.createdAt ?? null
      });
    }
  }
  return exposureById;
}

async function recordListingSearchImpressions<T extends ListingSearchItem>(listings: T[]) {
  const { error } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: null,
    action: "listing.search_impressions.recorded",
    metadata: {
      listingIds: listings.map((listing) => listing.id),
      total: listings.length,
      recordedAt: new Date().toISOString()
    }
  });
  throwDbError(error);
}

function lastSeenMs(value: string | null) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}
