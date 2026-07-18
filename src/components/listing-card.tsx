"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { ShareMenu } from "@/components/share-menu";
import { formatCurrencyBRL } from "@/lib/formatters";
import { realEstatePurposeLabel } from "@/lib/real-estate-taxonomy";
import { normalizeImageUrl } from "@/lib/image-url";
import { ListingMedia } from "@/components/listing-media";

type Listing = {
  slug: string;
  title: string;
  category?: "VEHICLE" | "REAL_ESTATE" | "PRODUCT";
  type: string;
  priceCents: number;
  city: string;
  state: string;
  showPhone?: boolean;
  showWhatsapp?: boolean;
  expiresAt?: Date | string;
  photos: ReadonlyArray<{ url: string; alt: string | null }>;
  realEstate?: { purpose?: string | null } | null;
  plan?: { code: string; name: string } | null;
  owner?: {
    phone?: string | null;
    whatsapp?: string | null;
    whatsapp2?: string | null;
    allowPublicPhone?: boolean;
    allowPublicWhatsapp?: boolean;
    acceptedTermsAt?: Date | string | null;
    identityVerifiedAt?: Date | string | null;
    _count?: { listings: number };
  } | null;
};

export function money(cents: number) {
  return formatCurrencyBRL(cents);
}

export function ListingCard({ listing, onOpenPreview }: { listing: Listing; onOpenPreview?: () => void }) {
  const photo = listing.photos[0];
  const photoUrl = normalizeImageUrl(photo?.url);
  const cardFrameClassName = listing.category === "REAL_ESTATE"
    ? "bg-[#38BDF8] shadow-[0_0_22px_rgba(56,189,248,0.22)]"
    : listing.category === "PRODUCT"
      ? "bg-[#F59E0B] shadow-[0_0_22px_rgba(245,158,11,0.22)]"
      : "bg-[#22C55E] shadow-[0_0_22px_rgba(34,197,94,0.22)]";
  const remaining = formatRemaining(listing.expiresAt);
  const realEstatePurpose = listing.category === "REAL_ESTATE" ? normalizePurposeLabel(listing.realEstate?.purpose) : null;
  const content = (
    <>
      <div className="relative aspect-[9/16] min-h-0 flex-1 bg-black sm:aspect-[4/3]">
        {photo ? (
          <ListingMedia src={photoUrl} alt={photo.alt ?? listing.title} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" quality={78} />
        ) : (
          <div className="grid h-full place-items-center text-sm font-bold text-neutral-400">Sem foto</div>
        )}
        {remaining ? (
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-3.5rem)] items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white shadow backdrop-blur sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
            <Clock size={12} className="shrink-0 text-yellow-300" />
            <span>{remaining}</span>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 space-y-1.5 p-2 text-left sm:space-y-2 sm:p-4">
        <div className="flex min-w-0 items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-300 sm:text-sm">
          <MapPin className="shrink-0" size={13} />
          <span className="truncate">{listing.city}, {listing.state}</span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-1">
          {realEstatePurpose ? (
            <span className="inline-flex max-w-full truncate rounded-full border border-emerald-300/35 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200 sm:px-3 sm:py-1 sm:text-xs">
              {realEstatePurpose}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <div className={`relative h-full overflow-visible rounded-2xl p-[2px] transition hover:-translate-y-0.5 sm:rounded-3xl ${cardFrameClassName}`}>
      <article className="soft-card relative h-full overflow-visible rounded-[0.9rem] sm:rounded-[1.35rem]">
        {onOpenPreview ? (
          <div role="button" tabIndex={0} onClick={onOpenPreview} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenPreview(); } }} className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[0.9rem] sm:rounded-[1.35rem]">
            {content}
          </div>
        ) : (
          <Link href={`/anuncios/${listing.slug}`} className="flex h-full flex-col overflow-hidden rounded-[0.9rem] sm:rounded-[1.35rem]">
            {content}
          </Link>
        )}
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <ShareMenu slug={listing.slug} title={listing.title} compact />
        </div>
      </article>
    </div>
  );
}

function normalizePurposeLabel(value?: string | null) {
  return realEstatePurposeLabel(value);
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
