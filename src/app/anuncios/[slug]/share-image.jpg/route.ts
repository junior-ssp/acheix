import sharp from "sharp";
import { absolutePublicUrl } from "@/lib/image-url";
import { findListingBySlug } from "@/lib/listing-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const width = 1200;
const height = 630;

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const listing = await findListingBySlug(params.slug).catch(() => null);
  const sourceUrl = absolutePublicUrl(listing?.photos?.[0]?.url || "/achei-x-logo-small.png");

  try {
    const source = await fetch(sourceUrl, { headers: { "user-agent": "AcheiX-Social-Preview/1.0" }, cache: "no-store" });
    if (!source.ok) throw new Error(`Imagem retornou HTTP ${source.status}`);
    const image = await sharp(Buffer.from(await source.arrayBuffer()))
      .rotate()
      .flatten({ background: "#050505" })
      .resize(width, height, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return jpegResponse(image, 86400);
  } catch {
    const fallback = await sharp({ create: { width, height, channels: 3, background: "#050505" } })
      .composite([{ input: Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#050505"/><text x="600" y="290" text-anchor="middle" font-family="Arial" font-size="92" font-weight="900" fill="#facc15">Achei X</text><text x="600" y="380" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#fff">Confira este anúncio</text></svg>`) }])
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return jpegResponse(fallback, 300);
  }
}

function jpegResponse(buffer: Buffer, maxAge: number) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=604800`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "index, follow"
    }
  });
}
