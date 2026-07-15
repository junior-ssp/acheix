import { EmptyState } from "@/components/empty-state";
import { ListingResultsGrid } from "@/components/listing-results-grid";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withTimeout } from "@/lib/async";
import { hydrateListings, listingColumns } from "@/lib/listing-records";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");
  const favorites = await withTimeout(findFavorites(user.id), [], 1800);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black">Meus Favoritos</h1>
      <div className="mt-6">
        {favorites.length ? (
          <ListingResultsGrid listings={JSON.parse(JSON.stringify(favorites.map((favorite) => favorite.listing)))} emptyTitle="Nenhum favorito salvo" resetHref="/favoritos" />
        ) : (
          <EmptyState title="Nenhum favorito salvo" description="Os anúncios favoritados ficam sincronizados com a sua conta." />
        )}
      </div>
    </main>
  );
}

async function findFavorites(userId: string) {
  const { data: favorites, error } = await db()
    .from("Favorite")
    .select("id,createdAt,listingId")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(40);
  throwDbError(error);
  const listingIds = (favorites ?? []).map((favorite) => favorite.listingId).filter(Boolean);
  const { data: listings, error: listingsError } = listingIds.length
    ? await db().from("Listing").select(listingColumns()).in("id", listingIds)
    : { data: [], error: null };
  throwDbError(listingsError);
  const hydrated = await hydrateListings((listings ?? []) as any[]);
  const byId = new Map(hydrated.map((listing) => [listing.id, listing]));
  return (favorites ?? []).map((favorite) => ({ ...favorite, listing: byId.get(favorite.listingId) })).filter((favorite): favorite is typeof favorite & { listing: NonNullable<typeof favorite.listing> } => Boolean(favorite.listing));
}

