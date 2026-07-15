import { ImageResponse } from "next/og";
import { findBannerCampaign } from "@/lib/banner-campaigns";
import { absolutePublicUrl } from "@/lib/image-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

type BannerOgImageProps = {
  params: { id: string };
};

export default async function BannerOgImage({ params }: BannerOgImageProps) {
  const banner = await findBannerCampaign(params.id).catch(() => null);
  const title = banner?.campaignTitle || "Banner patrocinado";
  const imageUrl = banner?.mediaUrl ? absolutePublicUrl(banner.mediaUrl) : absolutePublicUrl("/achei-x-logo-small.png");
  const imagePositionX = normalizePercent(banner?.imagePositionX);
  const imagePositionY = normalizePercent(banner?.imagePositionY ?? banner?.bannerImagePositionY);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#030303"
        }}
      >
        <img
          src={imageUrl}
          alt={title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${imagePositionX}% ${imagePositionY}%`
          }}
        />
      </div>
    ),
    size
  );
}

function normalizePercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, value));
}
