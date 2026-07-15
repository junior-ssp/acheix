type ListingCategory = "VEHICLE" | "REAL_ESTATE" | "PRODUCT";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { ListingResultsGrid } from "@/components/listing-results-grid";
import { findActiveListings, type ListingSearchParams } from "@/lib/listing-search";
import type { ManualListing } from "@/lib/manual-listings";
import type { Route } from "next";
import type { ComponentProps } from "react";

type ListingCardItem = ComponentProps<typeof ListingCard>["listing"];

export async function ListingResults({
  searchParams,
  category,
  emptyTitle = "Nenhum anúncio encontrado.",
  listings: providedListings,
  manualListings = []
}: {
  searchParams: ListingSearchParams;
  category?: ListingCategory;
  emptyTitle?: string;
  listings?: ListingCardItem[];
  manualListings?: ManualListing[];
}) {
  const listings = providedListings ?? await findActiveListings(searchParams, category);

  if (!listings.length && !manualListings.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Ajuste os filtros ou volte mais tarde para ver novos anúncios aprovados."
      />
    );
  }

  const clientListings = JSON.parse(JSON.stringify(listings)) as ListingCardItem[];
  const clientManualListings = JSON.parse(JSON.stringify(manualListings)) as ManualListing[];

  return (
    <ListingResultsGrid listings={clientListings} manualListings={clientManualListings} emptyTitle={emptyTitle} resetHref={resetHrefFor(category)} />
  );
}

function resetHrefFor(category?: ListingCategory): Route {
  if (category === "VEHICLE") return "/veiculos";
  if (category === "REAL_ESTATE") return "/imoveis";
  if (category === "PRODUCT") return "/produtos" as Route;
  return "/buscar";
}

