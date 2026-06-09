import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ShareRedirect } from "@/components/share-redirect";
import { money } from "@/components/listing-card";
import { getPublicAppBaseUrl } from "@/lib/app-url";
import { findListingBySlug } from "@/lib/listing-records";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const listing = await findListingBySlug(params.slug).catch(() => null);
  if (!listing) {
    return {
      title: "Anúncio não encontrado",
      description: "Este anúncio não está disponível no Achei X.",
      robots: { index: false, follow: false }
    };
  }

  const title = `${listing.title} - ${money(listing.priceCents)} - Achei X`;
  const description = compactText(`${listing.type} em ${listing.city}, ${listing.state}. ${listing.description || "Confira este anúncio no Achei X."}`, 155);
  const imageUrl = absoluteUrl(`/og/anuncios/${listing.slug}/image.png`);
  const shareUrl = absoluteUrl(`/p/${listing.slug}`);
  const listingUrl = absoluteUrl(`/anuncios/${listing.slug}`);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: listingUrl },
    openGraph: {
      title,
      description,
      url: shareUrl,
      siteName: "Achei X",
      type: "website",
      locale: "pt_BR",
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          type: "image/png",
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

export default async function ListingSharePage({ params }: { params: { slug: string } }) {
  const listing = await findListingBySlug(params.slug).catch(() => null);
  if (!listing) notFound();

  const listingPath = `/anuncios/${listing.slug}`;
  const photo = listing.photos[0];

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white">
      <ShareRedirect href={listingPath} />
      <section className="mx-auto grid max-w-xl gap-4">
        <div className="relative aspect-[1200/630] overflow-hidden rounded-lg bg-neutral-900">
          {photo ? (
            <Image src={photo.url} alt={photo.alt ?? listing.title} fill sizes="100vw" priority className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-lg font-black text-yellow-300">Achei X</div>
          )}
        </div>
        <div>
          <p className="text-lg font-black text-yellow-300">{money(listing.priceCents)}</p>
          <h1 className="mt-1 text-2xl font-black">{listing.title}</h1>
          <p className="mt-1 text-sm text-white/70">{listing.city}, {listing.state}</p>
        </div>
        <a href={listingPath} className="inline-flex h-12 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black">
          Abrir anúncio
        </a>
      </section>
    </main>
  );
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${getPublicAppBaseUrl().replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}

function compactText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}
