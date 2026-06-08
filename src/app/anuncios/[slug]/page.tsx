import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, Heart, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { ContactBox } from "@/components/contact-box";
import { ListingPhotoGallery } from "@/components/listing-photo-gallery";
import { money } from "@/components/listing-card";
import { PlanIcon } from "@/components/plan-icon";
import { ReportListingButton } from "@/components/report-listing-button";
import { ShareMenu } from "@/components/share-menu";
import { getCurrentUser } from "@/lib/auth";
import { demoListings } from "@/lib/constants";
import { formatIntegerBR } from "@/lib/formatters";
import { findListingBySlug } from "@/lib/listing-records";
import { db, throwDbError } from "@/lib/supabase-db";
import { calculateResponseMetrics, formatAverageResponse, responseTierLabel } from "@/lib/response-metrics";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const listing = await findListingBySlug(params.slug).catch(() => null);
  if (!listing) {
    return {
      title: "Anúncio não encontrado",
      description: "Este anúncio não está disponível no Achei X."
    };
  }

  const title = `${listing.title} - ${money(listing.priceCents)}`;
  const description = compactText(`${listing.type} em ${listing.city}, ${listing.state}. ${listing.description || "Confira este anúncio no Achei X."}`, 155);
  const imageUrl = absoluteUrl(listing.photos[0]?.url || "/achei-x-logo.png");
  const url = absoluteUrl(`/anuncios/${listing.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Achei X",
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: listing.photos[0]?.alt || listing.title
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

export default async function ListingPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  const databaseListing = await findListingBySlug(params.slug).catch(() => null);
  const listing = databaseListing ?? getDemoListing(params.slug);
  if (!listing) notFound();
  const galleryPhotos = buildGalleryPhotos(listing.photos, listing.title);
  const planName = listing.plan?.name ?? "GRÁTIS";
  const planClassName = listing.plan?.code === "FREE" || planName === "GRÁTIS" ? "text-emerald-400" : "text-yellow-300";
  const remaining = formatRemaining(listing.expiresAt);
  const publicHistory = getPublicHistory(listing.owner);
  const ownerId = "ownerId" in listing ? listing.ownerId : null;
  const isVerified = Boolean(listing.owner?.identityVerifiedAt);
  const ownerLeads = ownerId ? await findOwnerLeadMetrics(ownerId).catch(() => []) : [];
  const responseMetrics = calculateResponseMetrics(ownerLeads);
  const serviceScore = responseMetrics.score === null ? null : Math.round(responseMetrics.score / 10);

  return (
    <main className="min-h-[calc(100vh-65px)] bg-neutral-950 text-white">
      <section className="mx-auto grid max-w-6xl md:min-h-[calc(100vh-65px)] md:grid-cols-[minmax(320px,520px)_1fr]">
        <div className="relative aspect-[4/5] min-h-[360px] overflow-hidden bg-neutral-900 sm:aspect-[9/16] sm:min-h-[520px] md:min-h-[calc(100vh-65px)]">
          <ListingPhotoGallery photos={galleryPhotos} title={listing.title} />

          <div className="absolute left-3 top-3 flex max-w-[calc(100%-5.5rem)] flex-col items-start gap-1 rounded-xl bg-black/70 px-3 py-2 text-xs font-black text-white shadow backdrop-blur">
            <span className="flex items-center gap-1.5">
              <PlanIcon code={listing.plan?.code} name={planName} size={14} />
              <span className={planClassName}>{planName}</span>
            </span>
            {remaining ? (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="shrink-0 text-yellow-300" />
                <span>{remaining}</span>
              </span>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
            <p className="text-xl font-black sm:text-2xl">{money(listing.priceCents)}</p>
            <h1 className="mt-1 text-lg font-bold sm:text-xl">{listing.title}</h1>
            <p className="text-sm text-white/80">{listing.city}, {listing.state}</p>
          </div>
          <div className="absolute right-3 top-1/2 grid -translate-y-1/2 gap-3">
            <button title="Favoritar" className="grid h-12 w-12 place-items-center rounded-full bg-black/45 backdrop-blur"><Heart /></button>
            <ShareMenu slug={listing.slug} title={listing.title} />
            <button title="Contato" className="grid h-12 w-12 place-items-center rounded-full bg-black/45 backdrop-blur"><MessageCircle /></button>
          </div>
        </div>

        <aside className="space-y-5 bg-white p-4 text-ink dark:bg-neutral-900 dark:text-white sm:space-y-6 sm:p-6">
          <div>
            <span className="rounded bg-brand px-2 py-1 text-xs font-bold text-white">{listing.type}</span>
            {isVerified ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-sky-400/15 px-2 py-1 text-xs font-black text-sky-200">
                <ShieldCheck size={14} />
                Conta verificada
              </span>
            ) : null}
            <h2 className="mt-4 text-xl font-black sm:text-2xl">Detalhes do Anúncio</h2>
            <p className="mt-3 whitespace-pre-line text-neutral-700 dark:text-neutral-300">{listing.description}</p>
          </div>

          {listing.vehicle && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Marca" value={listing.vehicle.brand} />
              <Info label="Modelo" value={listing.vehicle.model} />
              <Info label="Versao" value={listing.vehicle.version ?? "-"} />
              {listing.vehicle.fipeCode ? <Info label="Codigo FIPE" value={listing.vehicle.fipeCode} /> : null}
              <Info label="Ano" value={listing.vehicle.year} />
              <Info label="Km" value={listing.vehicle.mileageKm ? formatIntegerBR(listing.vehicle.mileageKm) : "-"} />
            </dl>
          )}

          {listing.realEstate && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Finalidade" value={listing.realEstate.purpose} />
              <Info label="Quartos" value={listing.realEstate.bedrooms ?? "-"} />
              <Info label="Banheiros" value={listing.realEstate.bathrooms ?? "-"} />
              <Info label="Área" value={listing.realEstate.areaM2 ? `${listing.realEstate.areaM2} m2` : "-"} />
            </dl>
          )}

          <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="flex items-center gap-2 text-emerald-200">
              <ShieldCheck size={20} />
              <h3 className="font-black">Segurança e Confiança</h3>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-emerald-50">
              {isVerified ? (
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Conta verificada
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <Star size={16} />
                • Histórico: {publicHistory}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 ${responseMetrics.badgeClassName}`}>
                <MessageCircle size={16} />
                {responseMetrics.label} - {formatAverageResponse(responseMetrics.averageResponseMinutes)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Star size={16} />
                • Nota de Atendimento: {serviceScore ?? "novo"}{serviceScore !== null ? "/10" : ""} ({responseTierLabel(responseMetrics.tier)})
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} />
                • Taxa de Resposta: {responseMetrics.responseRate ?? 0}%
              </span>
            </div>
          </section>

          <div className="rounded-lg border border-emerald-300/30 bg-[#22C55E] p-4 text-black shadow-[0_0_22px_rgb(34_197_94_/_0.18)]">
            <h3 className="font-black">Entre em Contato</h3>
            <ContactBox slug={listing.slug} authenticated={Boolean(user)} />
          </div>

          <ReportListingButton slug={listing.slug} ownerId={ownerId} canBlock={Boolean(user && ownerId && ownerId !== user.id)} />
        </aside>
      </section>
    </main>
  );
}

async function findOwnerLeadMetrics(ownerId: string) {
  const { data: ownerListings, error: listingsError } = await db()
    .from("Listing")
    .select("id")
    .eq("ownerId", ownerId)
    .limit(200);
  throwDbError(listingsError);
  const listingIds = (ownerListings ?? []).map((item) => item.id).filter(Boolean);
  if (!listingIds.length) return [];
  const { data, error } = await db()
    .from("ContactLead")
    .select("createdAt,decidedAt,status")
    .in("listingId", listingIds)
    .order("createdAt", { ascending: false })
    .limit(100);
  throwDbError(error);
  return data ?? [];
}
function getDemoListing(slug: string) {
  const demo = demoListings.find((listing) => listing.slug === slug);
  if (!demo) return null;

  return {
    ...demo,
    description: "Anúncio demonstrativo criado para apresentar o layout do aplicativo enquanto não há anúncios reais aprovados.",
    showPhone: false,
    showWhatsapp: false,
    owner: { createdAt: new Date("2024-01-01"), identityVerifiedAt: null, _count: { listings: 8 } },
    vehicle: demo.category === "VEHICLE"
      ? { brand: demo.title.split(" ")[0], model: demo.title.split(" ").slice(1, 3).join(" "), version: demo.title.split(" ").slice(1, 4).join(" "), fipeCode: null, year: 2022, mileageKm: 42000 }
      : null,
    realEstate: demo.category === "REAL_ESTATE"
      ? { purpose: demo.priceCents <= 500000 ? "Locação" : "Venda", bedrooms: demo.type === "Sala Comercial" ? null : 3, bathrooms: 2, areaM2: demo.type === "Sala Comercial" ? 48 : 120 }
      : null
  };
}

function getPublicHistory(owner: { createdAt?: Date | string | null; _count?: { listings: number } } | null | undefined) {
  const listings = owner?._count?.listings ?? 0;
  const since = owner?.createdAt ? new Date(owner.createdAt) : null;
  const year = since && Number.isFinite(since.getTime()) ? since.getFullYear() : null;
  if (!listings && !year) return "sem histórico público ainda";
  if (year) return `${listings} anúncio(s) publicados desde ${year}`;
  return `${listings} anúncio(s) publicados`;
}

function buildGalleryPhotos(photos: ReadonlyArray<{ url: string; alt: string | null }>, title: string) {
  if (!photos.length) return [];
  const gallery = [...photos];
  while (gallery.length < 3) {
    gallery.push({ ...photos[gallery.length % photos.length], alt: photos[gallery.length % photos.length].alt ?? title });
  }
  return gallery;
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

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-mist p-3 dark:bg-neutral-950">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://acheix.com.br";
  return `${baseUrl.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}

function compactText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}

