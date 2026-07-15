"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import type { Route } from "next";
import { ListingCard } from "@/components/listing-card";
import { ListingResultReel } from "@/components/listing-result-reel";
import { ManualListingCard } from "@/components/manual-listing-card";
import { WantedRequestCard, type WantedRequestCardItem } from "@/components/wanted-request-card";
import type { ManualListing } from "@/lib/manual-listings";

type Listing = ComponentProps<typeof ListingCard>["listing"];

export function HomeMobileListingGrid({
  listings,
  wantedRequests,
  manualListings,
  emptyTitle,
  resetHref,
  gridClassName = "grid gap-3 sm:grid-cols-2 sm:gap-4",
  maxItems
}: {
  listings: Listing[];
  wantedRequests: WantedRequestCardItem[];
  manualListings?: ManualListing[];
  emptyTitle: string;
  resetHref: Route;
  gridClassName?: string;
  maxItems?: number;
}) {
  const feedId = useId();

  function openPreview(slug: string) {
    window.dispatchEvent(new CustomEvent("open-listing-feed", { detail: { slug, feedId } }));
  }

  const cards: ReactNode[] = [];
  listings.forEach((listing, index) => {
    cards.push(<ListingCard key={listing.slug} listing={listing} onOpenPreview={() => openPreview(listing.slug)} />);
    if (manualListings?.[index]) cards.push(<ManualListingCard key={manualListings[index].id} listing={manualListings[index]} />);
    if (wantedRequests[index]) cards.push(<WantedRequestCard key={wantedRequests[index].id} request={wantedRequests[index]} />);
  });
  manualListings?.slice(listings.length).forEach((listing) => {
    cards.push(<ManualListingCard key={listing.id} listing={listing} />);
  });
  wantedRequests.slice(listings.length).forEach((request) => {
    cards.push(<WantedRequestCard key={request.id} request={request} />);
  });
  const visibleCards = typeof maxItems === "number" ? cards.slice(0, maxItems) : cards;

  return (
    <>
      <div className={gridClassName}>
        {visibleCards}
      </div>
      <ListingResultReel listings={listings} emptyTitle={emptyTitle} resetHref={resetHref} feedId={feedId} />
    </>
  );
}
