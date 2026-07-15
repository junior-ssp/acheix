import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { findBannerCampaign } from "@/lib/banner-campaigns";
import { absolutePublicUrl, imageContentType } from "@/lib/image-url";

export const dynamic = "force-dynamic";

type BannerPageProps = {
  params: { id: string };
  searchParams?: { v?: string };
};

export async function generateMetadata({ params, searchParams }: BannerPageProps): Promise<Metadata> {
  const banner = await findBannerCampaign(params.id).catch(() => null);
  const shareText = "Veja este banner patrocinado no Achei X.";
  const version = searchParams?.v || (banner?.updatedAt ? Date.parse(banner.updatedAt).toString(36) : Date.now().toString(36));
  const canonicalUrl = absolutePublicUrl(`/banner/${params.id}`);
  const fallbackImage = absolutePublicUrl(`/banner/${params.id}/share-image.jpg?v=${encodeURIComponent(version)}`);
  const image = banner?.mediaUrl ? versionedAbsoluteUrl(banner.mediaUrl, version) : fallbackImage;
  const imageType = imageContentType(image);

  return {
    title: { absolute: shareText },
    description: shareText,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title: shareText,
      description: shareText,
      type: "website",
      url: canonicalUrl,
      siteName: "Achei X",
      images: [
        { url: image, secureUrl: image, width: 1200, height: 630, type: imageType, alt: shareText },
        { url: fallbackImage, secureUrl: fallbackImage, width: 1200, height: 630, type: "image/jpeg", alt: shareText }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: shareText,
      description: shareText,
      images: [image]
    }
  };
}

export default async function BannerSharePage({ params }: BannerPageProps) {
  const banner = await findBannerCampaign(params.id).catch(() => null);
  const safeDestinationUrl = safeHttpUrl(banner?.destinationUrl);

  if (!banner || banner.status === "REMOVED") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-yellow-300 hover:text-yellow-200">
          <ArrowLeft size={16} />
          Voltar para o Achei X
        </Link>
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="text-2xl font-black text-white">Banner indisponível</h1>
          <p className="mt-2 text-sm text-neutral-300">Este banner não está mais disponível para visualização.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
      <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-white hover:bg-white/10">
        <ArrowLeft size={15} />
        Voltar
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-yellow-300/25 bg-black">
        <div className="relative aspect-[7/2] min-h-36 bg-black">
          {banner.mediaUrl ? <img src={banner.mediaUrl} alt={banner.campaignTitle} className="h-full w-full object-cover" /> : null}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Banner patrocinado</p>
        <h1 className="mt-2 text-3xl font-black text-white">{banner.campaignTitle}</h1>
        <p className="mt-2 text-sm text-neutral-300">Você está vendo um banner compartilhado do Achei X.</p>

        {safeDestinationUrl ? (
          <a href={safeDestinationUrl} target="_blank" rel="noopener noreferrer sponsored" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">
            Acessar anúncio
            <ExternalLink size={16} />
          </a>
        ) : (
          <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">
            Ver Achei X
          </Link>
        )}
      </section>
    </main>
  );
}

function versionedAbsoluteUrl(value: string, version: string) {
  const url = new URL(absolutePublicUrl(value));
  url.searchParams.set("v", version);
  return url.toString();
}

function safeHttpUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
