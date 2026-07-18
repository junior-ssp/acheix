"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { normalizeImageUrl } from "@/lib/image-url";
import { displayManualListingAddress, displayManualListingTitle, type ManualListing } from "@/lib/manual-listings-shared";
import { PublicShareButton } from "@/components/public-share-button";
import { ListingMedia } from "@/components/listing-media";

export function ManualListingCard({ listing }: { listing: ManualListing }) {
  const router = useRouter();
  const photo = listing.photos[0];
  const category = categoryMeta(listing.category);
  const remaining = formatRemaining(listing.expiresAt);
  const title = displayManualListingTitle(listing.title);
  const address = displayManualListingAddress(listing.address);
  const detailPath = manualListingSharePath(listing);

  function openDetail() {
    router.push(detailPath as Route);
  }

  return (
    <div className={`relative h-full overflow-visible rounded-2xl p-[2px] transition hover:-translate-y-0.5 sm:rounded-3xl ${category.frame}`}>
      <article
        role="button"
        tabIndex={0}
        aria-label={`Abrir anúncio ${title}`}
        onClick={openDetail}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetail();
          }
        }}
        className="soft-card flex h-full cursor-pointer flex-col overflow-hidden rounded-[0.9rem] sm:rounded-[1.35rem]"
      >
        <div className="relative aspect-[9/16] min-h-0 flex-1 bg-black sm:aspect-[4/3]">
          {photo ? (
            <ListingMedia src={normalizeImageUrl(photo.url)} alt={photo.alt ?? title} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" quality={78} />
          ) : (
            <div className="grid h-full place-items-center text-sm font-bold text-neutral-400">Sem foto</div>
          )}
          {remaining ? (
            <div className="absolute left-2 top-2 flex max-w-[calc(100%-4rem)] items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white shadow backdrop-blur sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
              <Clock size={12} className="shrink-0 text-yellow-300" />
              <span>{remaining}</span>
            </div>
          ) : null}
          <div className="absolute right-2 top-2 sm:right-3 sm:top-3" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <PublicShareButton title={`Achei este anúncio: ${title}`} path={manualListingSharePath(listing)} compact />
          </div>
        </div>
        {address ? <div className="shrink-0 p-2 text-left sm:p-3">
          {address ? (
            <div className="flex min-w-0 items-start gap-1 text-[11px] text-neutral-600 dark:text-neutral-300 sm:text-sm">
              <MapPin className="mt-0.5 shrink-0" size={13} />
              <span className="line-clamp-2">{address}</span>
            </div>
          ) : null}
        </div> : null}
      </article>
    </div>
  );
}

function categoryMeta(category: ManualListing["category"]) {
  if (category === "REAL_ESTATE") return { label: "IMÓVEL", frame: "bg-[#38BDF8] shadow-[0_0_22px_rgba(56,189,248,0.22)]", text: "text-sky-300" };
  if (category === "PRODUCT") return { label: "PRODUTO", frame: "bg-[#F59E0B] shadow-[0_0_22px_rgba(245,158,11,0.24)]", text: "text-amber-200" };
  if (category === "COMPANY") return { label: "EMPRESA", frame: "bg-[#A855F7] shadow-[0_0_22px_rgba(168,85,247,0.22)]", text: "text-purple-200" };
  if (category === "SERVICE") return { label: "SERVIÇO", frame: "bg-[#FACC15] shadow-[0_0_22px_rgba(250,204,21,0.22)]", text: "text-yellow-300" };
  return { label: "VEÍCULO", frame: "bg-[#22C55E] shadow-[0_0_22px_rgba(34,197,94,0.22)]", text: "text-emerald-300" };
}

function manualListingSharePath(listing: ManualListing) {
  return `/avulso/${listing.id}`;
}

function formatRemaining(expiresAt?: Date | string) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  const diff = expires - Date.now();
  if (!Number.isFinite(expires)) return null;
  if (diff <= 0) return "Expirado";
  const hours = Math.ceil(diff / 3600000);
  if (hours < 48) return `${hours}h`;
  return `${Math.ceil(hours / 24)} dias`;
}
