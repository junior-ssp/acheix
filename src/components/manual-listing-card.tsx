"use client";

import Image from "next/image";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Clock, ExternalLink, Globe, Instagram, MapPin, Music2, Phone, Video, Youtube } from "lucide-react";
import { normalizeImageUrl } from "@/lib/image-url";
import { displayManualListingAddress, displayManualListingTitle, manualListingPhoneUrl, manualListingWhatsappUrl, type ManualListing } from "@/lib/manual-listings";
import { PublicShareButton } from "@/components/public-share-button";
import { formatCurrencyBRL } from "@/lib/formatters";

export function ManualListingCard({ listing }: { listing: ManualListing }) {
  const router = useRouter();
  const photo = listing.photos[0];
  const category = categoryMeta(listing.category);
  const remaining = formatRemaining(listing.expiresAt);
  const links = socialLinks(listing);
  const title = displayManualListingTitle(listing.title);
  const address = displayManualListingAddress(listing.address);
  const contactLinks = [
    { label: listing.phone ?? "Telefone", href: manualListingPhoneUrl(listing.phone) },
    { label: listing.tollFree ? `0800 ${listing.tollFree}` : "0800", href: manualListingPhoneUrl(listing.tollFree) },
    { label: listing.whatsapp ? `Whatsapp 1 ${listing.whatsapp}` : "Whatsapp 1", href: manualListingWhatsappUrl(listing.whatsapp ?? "", "", listing.title) },
    { label: listing.whatsapp2 ? `Whatsapp 2 ${listing.whatsapp2}` : "Whatsapp 2", href: manualListingWhatsappUrl(listing.whatsapp2 ?? "", "", listing.title) }
  ].filter((link, index, items) => link.href && items.findIndex((item) => item.href === link.href) === index);
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
        <div className="relative aspect-[4/3] min-h-0 flex-1 bg-neutral-200 dark:bg-neutral-800">
          {photo ? (
            <Image src={normalizeImageUrl(photo.url)} alt={photo.alt ?? title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" quality={78} className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm font-bold text-neutral-400">Sem foto</div>
          )}
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-4rem)] flex-col items-start gap-0.5 rounded-xl bg-black/70 px-2 py-1 text-[10px] font-black text-white shadow backdrop-blur sm:left-3 sm:top-3 sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-full sm:px-3 sm:text-xs">
            <span className={category.text}>{category.label}</span>
            {remaining ? (
              <span className="flex items-center gap-1.5">
                <span className="hidden h-3 w-px bg-white/30 sm:block" />
                <Clock size={12} className="shrink-0 text-yellow-300" />
                <span>{remaining}</span>
              </span>
            ) : null}
          </div>
          <div className="absolute right-2 top-2 sm:right-3 sm:top-3" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <PublicShareButton title={`Achei este anúncio: ${title}`} path={manualListingSharePath(listing)} compact />
          </div>
        </div>
        <div className="shrink-0 space-y-2 p-2 text-left sm:p-4">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug sm:text-base">{title}</h3>
          {listing.priceCents ? <p className="text-sm font-black text-yellow-300 sm:text-lg">{formatCurrencyBRL(listing.priceCents)}</p> : null}
          {address ? (
            <div className="flex min-w-0 items-start gap-1 text-[11px] text-neutral-600 dark:text-neutral-300 sm:text-sm">
              <MapPin className="mt-0.5 shrink-0" size={13} />
              <span className="line-clamp-2">{address}</span>
            </div>
          ) : null}
          {contactLinks.length ? (
            <div className="grid gap-1.5">
              {contactLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[#22C55E] px-3 text-xs font-black text-black hover:bg-[#34D399] sm:text-sm">
                  <Phone size={15} />
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
          {links.length ? (
            <div className="grid grid-cols-2 gap-1.5">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-full border border-white/10 px-2 text-[10px] font-black text-neutral-200 hover:border-yellow-300/50 hover:text-yellow-200 sm:text-xs">
                    <Icon size={13} />
                    <span className="truncate">{link.label}</span>
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function socialLinks(listing: ManualListing) {
  return [
    { label: "Site", href: normalizeHref(listing.website), icon: Globe },
    { label: "Facebook", href: normalizeHref(listing.facebook), icon: ExternalLink },
    { label: "Instagram", href: normalizeHref(listing.instagram), icon: Instagram },
    { label: "YouTube", href: normalizeHref(listing.youtube), icon: Youtube },
    { label: "TikTok", href: normalizeHref(listing.tiktok), icon: Music2 },
    { label: "Vídiu", href: normalizeHref(listing.vidiu), icon: Video }
  ].filter((link): link is { label: string; href: string; icon: typeof Globe } => Boolean(link.href));
}

function normalizeHref(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
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
