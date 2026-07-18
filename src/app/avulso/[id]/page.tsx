import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, Globe, Instagram, MapPin, Music2, Phone, Video, Youtube } from "lucide-react";
import { PublicShareButton } from "@/components/public-share-button";
import { absolutePublicUrl, imageContentType, normalizeImageUrl, optimizedOpenGraphImageUrl } from "@/lib/image-url";
import { displayManualListingAddress, displayManualListingTitle, findPublicManualListing, manualListingPhoneUrl, manualListingWhatsappUrl, type ManualListing } from "@/lib/manual-listings";
import { formatCurrencyBRL } from "@/lib/formatters";
import { ListingMedia } from "@/components/listing-media";

export const dynamic = "force-dynamic";

type ManualListingPageProps = {
  params: { id: string };
};

export async function generateMetadata({ params }: ManualListingPageProps): Promise<Metadata> {
  const listing = await findPublicManualListing(params.id).catch(() => null);
  if (!listing) {
    return {
      title: "Anúncio indisponível",
      description: "Este anúncio não está disponível no Achei X."
    };
  }

  const listingTitle = displayManualListingTitle(listing.title);
  const address = displayManualListingAddress(listing.address);
  const title = `${listingTitle} - Achei X`;
  const description = compactText(`${categoryLabel(listing.category)}${address ? ` em ${address}` : ""}. Confira este anúncio no Achei X.`, 155);
  const imageUrl = optimizedOpenGraphImageUrl(listing.photos[0]?.url);
  const url = absolutePublicUrl(`/avulso/${listing.id}`);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Achei X",
      type: "website",
      locale: "pt_BR",
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          type: imageContentType(imageUrl),
          width: 1200,
          height: 630,
          alt: listing.photos[0]?.alt || listingTitle
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function ManualListingSharePage({ params }: ManualListingPageProps) {
  const listing = await findPublicManualListing(params.id);
  if (!listing) notFound();
  const links = socialLinks(listing);
  const category = categoryLabel(listing.category);
  const title = displayManualListingTitle(listing.title);
  const address = displayManualListingAddress(listing.address);
  const contactLinks = [
    { label: listing.phone ?? "Telefone", href: manualListingPhoneUrl(listing.phone) },
    { label: listing.tollFree ? `0800 ${listing.tollFree}` : "0800", href: manualListingPhoneUrl(listing.tollFree) },
    { label: listing.whatsapp ? `Whatsapp 1 ${listing.whatsapp}` : "Whatsapp 1", href: manualListingWhatsappUrl(listing.whatsapp ?? "", "", listing.title) },
    { label: listing.whatsapp2 ? `Whatsapp 2 ${listing.whatsapp2}` : "Whatsapp 2", href: manualListingWhatsappUrl(listing.whatsapp2 ?? "", "", listing.title) }
  ].filter((link, index, items) => link.href && items.findIndex((item) => item.href === link.href) === index);

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
      <Link href={categoryPath(listing.category)} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-white hover:bg-white/10">
        <ArrowLeft size={15} />
        Voltar
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-yellow-300/25 bg-black">
        <div className="relative bg-neutral-900">
          {listing.photos.length ? (
            <div className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
              {listing.photos.map((photo, index) => (
                <figure id={`foto-${index + 1}`} key={photo.id} className="relative aspect-[9/16] max-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5rem)] min-w-full snap-center sm:aspect-[4/5]">
                  <ListingMedia src={normalizeImageUrl(photo.url)} alt={photo.alt ?? `${title} - foto ${index + 1}`} sizes="(max-width: 768px) 100vw, 960px" priority={index === 0} />
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid aspect-[4/3] h-full place-items-center text-sm font-bold text-neutral-400 sm:aspect-[16/9]">Sem foto</div>
          )}
          {listing.photos.length > 1 ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur">
              {listing.photos.map((photo, index) => (
                <a key={photo.id} href={`#foto-${index + 1}`} className="h-2 w-6 rounded-full bg-yellow-300/80" aria-label={`Ver foto ${index + 1}`} />
              ))}
            </div>
          ) : null}
          <div className="absolute right-3 top-3">
            <PublicShareButton title={`Achei este anúncio: ${title}`} path={`/avulso/${listing.id}`} compact />
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">{category}</p>
        <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
        {listing.priceCents ? <p className="mt-2 text-2xl font-black text-yellow-300">{formatCurrencyBRL(listing.priceCents)}</p> : null}
        <div className="mt-4 grid gap-2 text-sm text-neutral-200">
          {address ? (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 shrink-0 text-yellow-300" size={18} />
              <span>{address}</span>
            </p>
          ) : null}
          <p className="flex items-center gap-2">
            <Clock className="text-yellow-300" size={18} />
            <span>{formatRemaining(listing.expiresAt)}</span>
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {contactLinks.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#22C55E] px-5 text-sm font-black text-black hover:bg-[#34D399]">
              <Phone size={17} />
              {link.label}
            </a>
          ))}
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-white/10 px-4 text-sm font-black text-white hover:border-yellow-300/50 hover:text-yellow-200">
                <Icon size={16} />
                <span className="truncate">{link.label}</span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
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

function categoryLabel(category: ManualListing["category"]) {
  if (category === "VEHICLE") return "Veículo";
  if (category === "REAL_ESTATE") return "Imóvel";
  if (category === "PRODUCT") return "Produto";
  if (category === "COMPANY") return "Empresa";
  return "Serviço";
}

function categoryPath(category: ManualListing["category"]) {
  if (category === "VEHICLE") return "/veiculos";
  if (category === "REAL_ESTATE") return "/imoveis";
  if (category === "PRODUCT") return "/produtos";
  return "/servicos";
}

function formatRemaining(expiresAt?: Date | string) {
  if (!expiresAt) return "Prazo indisponível";
  const expires = new Date(expiresAt).getTime();
  const diff = expires - Date.now();
  if (!Number.isFinite(expires)) return "Prazo indisponível";
  if (diff <= 0) return "Expirado";
  const days = Math.ceil(diff / 86400000);
  return `${days} dia${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}`;
}

function compactText(value: string, limit: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}...`;
}
