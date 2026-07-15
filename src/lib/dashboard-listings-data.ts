import { hydrateListings, listingColumns } from "@/lib/listing-records";
import { parsePublishProviderRef } from "@/lib/payments";
import { db, throwDbError } from "@/lib/supabase-db";

export async function findDashboardListings(ownerId: string) {
  const { data, error } = await db()
    .from("Listing")
    .select(listingColumns())
    .eq("ownerId", ownerId)
    .order("createdAt", { ascending: false });
  throwDbError(error);
  const hydrated = await hydrateListings((data ?? []) as any[]);
  const listingIds = hydrated.map((listing) => listing.id);
  const [favoriteRows, leadRows, pendingPaymentRows] = await Promise.all([
    listingIds.length ? db().from("Favorite").select("listingId").in("listingId", listingIds) : Promise.resolve({ data: [], error: null }),
    listingIds.length ? db().from("ContactLead").select("listingId").in("listingId", listingIds) : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? db()
        .from("Payment")
        .select("id,providerRef,createdAt")
        .eq("userId", ownerId)
        .eq("status", "PENDING")
        .like("providerRef", "publish:%")
        .order("createdAt", { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ]);
  throwDbError(favoriteRows.error);
  throwDbError(leadRows.error);
  throwDbError(pendingPaymentRows.error);
  const favorites = countByListing(favoriteRows.data ?? []);
  const leads = countByListing(leadRows.data ?? []);
  const pendingPaymentByListing = new Map<string, { id: string; createdAt: string }>();
  for (const payment of (pendingPaymentRows.data ?? []) as Array<{ id: string; providerRef: string | null; createdAt: string }>) {
    const reference = parsePublishProviderRef(payment.providerRef);
    if (!reference || pendingPaymentByListing.has(reference.listingId)) continue;
    pendingPaymentByListing.set(reference.listingId, { id: payment.id, createdAt: payment.createdAt });
  }
  return hydrated.map((listing) => ({
    ...listing,
    photos: listing.photos.slice(0, 1),
    pendingPaymentId: pendingPaymentByListing.get(listing.id)?.id ?? null,
    pendingPaymentCreatedAt: pendingPaymentByListing.get(listing.id)?.createdAt ?? null,
    _count: { favorites: favorites.get(listing.id) ?? 0, contactLeads: leads.get(listing.id) ?? 0 }
  }));
}

function countByListing(rows: Array<{ listingId?: string | null }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.listingId) continue;
    counts.set(row.listingId, (counts.get(row.listingId) ?? 0) + 1);
  }
  return counts;
}
