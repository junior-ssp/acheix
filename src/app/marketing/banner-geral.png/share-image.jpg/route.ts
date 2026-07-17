import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const width = 1200;
const height = 630;

export async function GET() {
  try {
    const source = await readFile(path.join(process.cwd(), "public", "marketing-assets", "banner-geral.png"));
    const metadata = await sharp(source).metadata();
    const sourceWidth = metadata.width ?? 1024;
    const sourceHeight = metadata.height ?? 1536;
    const cropHeight = Math.min(sourceHeight, Math.max(1, Math.round(sourceWidth * height / width)));
    const image = await sharp(source)
      .extract({ left: 0, top: 0, width: sourceWidth, height: cropHeight })
      .resize(width, height, { fit: "fill" })
      .flatten({ background: "#052e16" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();

    return jpegResponse(image, 604800);
  } catch {
    const fallback = await sharp({ create: { width, height, channels: 3, background: "#052e16" } })
      .composite([{ input: Buffer.from('<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#052e16"/><text x="600" y="285" text-anchor="middle" font-family="Arial" font-size="112" font-weight="900" fill="#facc15">Achei X</text><text x="600" y="380" text-anchor="middle" font-family="Arial" font-size="40" font-weight="700" fill="#ffffff">Vender · Comprar · Alugar</text></svg>') }])
      .jpeg({ quality: 86, mozjpeg: true })
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
