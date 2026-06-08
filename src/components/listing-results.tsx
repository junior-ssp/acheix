type ListingCategory = "VEHICLE" | "REAL_ESTATE";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { findActiveListings, type ListingSearchParams } from "@/lib/listing-search";

export async function ListingResults({
  searchParams,
  category,
  emptyTitle = "Nenhum anúncio encontrado."
}: {
  searchParams: ListingSearchParams;
  category?: ListingCategory;
  emptyTitle?: string;
}) {
  const listings = await findActiveListings(searchParams, category);

  if (!listings.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Ajuste os filtros ou volte mais tarde para ver novos anúncios aprovados."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}


