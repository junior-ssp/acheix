"use client";

import { useId, type ComponentProps } from "react";
import type { Route } from "next";
import { ListingCard } from "@/components/listing-card";
import { ManualListingCard } from "@/components/manual-listing-card";
import { ListingResultReel } from "@/components/listing-result-reel";
import type { ManualListing } from "@/lib/manual-listings";

type Listing = ComponentProps<typeof ListingCard>["listing"];

export function ListingResultsGrid({
  listings,
  manualListings = [],
  emptyTitle,
  resetHref,
  gridClassName = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
}: {
  listings: Listing[];
  manualListings?: ManualListing[];
  emptyTitle: string;
  resetHref: Route;
  gridClassName?: string;
}) {
  const feedId = useId();

  function openPreview(slug: string) {
    window.dispatchEvent(new CustomEvent("open-listing-feed", { detail: { slug, feedId } }));
  }

  return (
    <>
      <div className={gridClassName}>
        {manualListings.map((listing) => (
          <ManualListingCard key={listing.id} listing={listing} />
        ))}
        {listings.map((listing) => (
          <ListingCard key={listing.slug} listing={listing} onOpenPreview={() => openPreview(listing.slug)} />
        ))}
      </div>
      <ListingResultReel listings={listings} emptyTitle={emptyTitle} resetHref={resetHref} feedId={feedId} />
    </>
  );
}
