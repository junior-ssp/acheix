import sharp from "sharp";
import { findBannerCampaign } from "@/lib/banner-campaigns";
import { absolutePublicUrl } from "@/lib/image-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShareImageRouteProps = {
  params: { id: string };
};

const width = 1200;
const height = 630;

export async function GET(_request: Request, { params }: ShareImageRouteProps) {
  const banner = await findBannerCampaign(params.id).catch(() => null);
  const sourceUrl = banner?.mediaUrl ? absolutePublicUrl(banner.mediaUrl) : absolutePublicUrl("/achei-x-logo-small.png");

  try {
    const source = await fetch(sourceUrl, {
      headers: {
        "user-agent": "AcheiX-Social-Preview/1.0"
      },
      cache: "no-store"
    });

    if (!source.ok) throw new Error(`Imagem do banner retornou HTTP ${source.status}`);

    const inputBuffer = Buffer.from(await source.arrayBuffer());
    const imagePositionX = normalizePercent(banner?.imagePositionX);
    const imagePositionY = normalizePercent(banner?.imagePositionY ?? banner?.bannerImagePositionY);
    const trimmedBuffer = await sharp(inputBuffer)
      .flatten({ background: "#050505" })
      .trim({
        background: "#ffffff",
        threshold: 18
      })
      .toBuffer();
    const crop = await coverExtract(trimmedBuffer, imagePositionX, imagePositionY);
    const imageBuffer = await sharp(trimmedBuffer)
      .flatten({ background: "#050505" })
      .extract(crop)
      .resize(width, height, { fit: "fill" })
      .jpeg({
        quality: 90,
        mozjpeg: true
      })
      .toBuffer();

    return new Response(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(imageBuffer.length),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Robots-Tag": "index, follow"
      }
    });
  } catch {
    const fallback = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: "#050505"
      }
    })
      .composite([
        {
          input: Buffer.from(`
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
              <rect width="${width}" height="${height}" fill="#050505"/>
              <rect x="70" y="70" width="1060" height="490" rx="46" fill="#101010" stroke="#facc15" stroke-width="4"/>
              <text x="600" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="#facc15">Achei X</text>
              <text x="600" y="372" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">Banner patrocinado</text>
            </svg>
          `)
        }
      ])
      .jpeg({
        quality: 90,
        mozjpeg: true
      })
      .toBuffer();

    return new Response(new Uint8Array(fallback), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(fallback.length),
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Robots-Tag": "index, follow"
      }
    });
  }
}

async function coverExtract(inputBuffer: Buffer, positionX: number, positionY: number) {
  const metadata = await sharp(inputBuffer).metadata();
  const sourceWidth = metadata.width ?? width;
  const sourceHeight = metadata.height ?? height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;

  if (Math.abs(sourceRatio - targetRatio) < 0.01) {
    return { left: 0, top: 0, width: sourceWidth, height: sourceHeight };
  }

  if (sourceRatio > targetRatio) {
    const cropWidth = Math.max(1, Math.round(sourceHeight * targetRatio));
    const maxLeft = Math.max(0, sourceWidth - cropWidth);
    return {
      left: Math.round(maxLeft * (positionX / 100)),
      top: 0,
      width: cropWidth,
      height: sourceHeight
    };
  }

  const cropHeight = Math.max(1, Math.round(sourceWidth / targetRatio));
  const maxTop = Math.max(0, sourceHeight - cropHeight);
  return {
    left: 0,
    top: Math.round(maxTop * (positionY / 100)),
    width: sourceWidth,
    height: cropHeight
  };
}

function normalizePercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, value));
}
