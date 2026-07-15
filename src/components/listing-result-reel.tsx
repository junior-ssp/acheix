"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin, X } from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { EmptyState } from "@/components/empty-state";
import { ListingCard, money } from "@/components/listing-card";
import { ListingPhotoGallery } from "@/components/listing-photo-gallery";
import { ShareMenu } from "@/components/share-menu";
import { normalizeImageUrl } from "@/lib/image-url";

type Listing = ComponentProps<typeof ListingCard>["listing"];

export function ListingResultReel({
  listings,
  emptyTitle,
  resetHref,
  feedId
}: {
  listings: Listing[];
  emptyTitle: string;
  resetHref: Route;
  feedId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function openFeed(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const targetFeedId = typeof detail?.feedId === "string" ? detail.feedId : null;
      if (targetFeedId && feedId && targetFeedId !== feedId) return;
      const slug = typeof detail?.slug === "string" ? detail.slug : null;
      const index = slug ? listings.findIndex((listing) => listing.slug === slug) : 0;
      setOpenIndex(index >= 0 ? index : 0);
      setOpen(true);
    }

    window.addEventListener("open-listing-feed", openFeed);
    return () => window.removeEventListener("open-listing-feed", openFeed);
  }, [feedId, listings]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      scroller.scrollTo({ top: openIndex * scroller.clientHeight, behavior: "auto" });
    }, 0);
  }, [open, openIndex]);

  if (!listings.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Ajuste os filtros ou volte mais tarde para ver novos anúncios aprovados."
      />
    );
  }

  if (!open) return null;

  function closeReel() {
    setOpen(false);
  }

  function goHome() {
    window.location.href = "/";
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[92] bg-gradient-to-b from-black/85 via-black/35 to-transparent pb-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goHome}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-black/65 px-4 text-sm font-black text-white backdrop-blur hover:bg-white/15"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goHome}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-yellow-300 px-4 text-sm font-black text-black hover:bg-yellow-200"
            >
              <ArrowLeft size={17} />
              Voltar
            </button>
            <button
              type="button"
              onClick={closeReel}
              aria-label="Fechar resultados"
              className="grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white backdrop-blur hover:bg-white/15"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollerRef} className="h-[100svh] overflow-y-auto snap-y snap-mandatory overscroll-contain">
        {listings.map((listing, index) => {
          const photos = buildGalleryPhotos(listing.photos, listing.title);
          return (
            <article key={listing.slug} className="relative min-h-[100svh] overflow-hidden snap-start snap-always">
              {photos.length ? (
                <ListingPhotoGallery photos={photos} title={listing.title} />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-neutral-900 text-sm font-black text-neutral-500">
                  Sem foto
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/20" />
              <div className="absolute right-5 top-1/2 z-[91] -translate-y-1/2 sm:right-6">
                <ShareMenu slug={listing.slug} title={listing.title} />
              </div>

              <div className="absolute inset-x-0 bottom-0 z-[91] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-4 sm:p-6">
                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center justify-end gap-3">
                    <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-black text-white backdrop-blur">
                      {index + 1}/{listings.length}
                    </span>
                  </div>
                  <p className="text-xs font-black uppercase text-yellow-300">{listing.type}</p>
                  <h2 className="mt-2 line-clamp-3 text-2xl font-black leading-tight text-white drop-shadow sm:text-5xl">
                    {listing.title}
                  </h2>
                  <p className="mt-2 text-2xl font-black text-white drop-shadow sm:text-4xl">{money(listing.priceCents)}</p>
                  <div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-bold text-neutral-100 sm:text-base">
                    <MapPin size={18} className="shrink-0 text-emerald-300" />
                    <span className="truncate">{listing.city}, {listing.state}</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:flex">
                  <Link
                    href={`/anuncios/${listing.slug}`}
                    className="btn-green inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm sm:w-auto"
                  >
                    Abrir anúncio
                    <ArrowUpRight size={18} />
                  </Link>
                  <Link
                    href={resetHref}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200 sm:w-auto"
                  >
                    Refazer Pesquisa
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function buildGalleryPhotos(photos: Listing["photos"], title: string) {
  if (!photos.length) return [];
  return photos.map((photo) => ({
    url: normalizeImageUrl(photo.url),
    alt: photo.alt ?? title
  }));
}
