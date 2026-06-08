import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { hydrateListings, listingColumns } from "@/lib/listing-records";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { data: favorites, error } = await db()
      .from("Favorite")
      .select("id,createdAt,listingId")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });
    throwDbError(error);
    const listingIds = (favorites ?? []).map((favorite) => favorite.listingId).filter(Boolean);
    const { data: listings, error: listingsError } = listingIds.length
      ? await db().from("Listing").select(listingColumns()).in("id", listingIds)
      : { data: [], error: null };
    throwDbError(listingsError);
    const hydrated = await hydrateListings((listings ?? []) as any[]);
    const byId = new Map(hydrated.map((listing) => [listing.id, listing]));
    return json({ favorites: (favorites ?? []).map((favorite) => ({ ...favorite, listing: byId.get(favorite.listingId) })).filter((favorite) => favorite.listing) });
  } catch (error) {
    return errorResponse(error);
  }
}

