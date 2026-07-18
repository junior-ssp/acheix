import { readFileSync } from "node:fs";
import sharp from "sharp";
import { inspectListingImage } from "../src/lib/listing-image-validation";

const cases = [
  [1080, 1920], [1080, 2400], [1170, 2532], [1920, 1080], [1600, 900], [1080, 1080], [160, 1600], [2400, 160]
] as const;

async function main() {

for (const [width, height] of cases) {
  const bytes = await sharp({ create: { width, height, channels: 3, background: "#111111" } }).jpeg().toBuffer();
  const result = await inspectListingImage(bytes);
  if (result.width !== width || result.height !== height || result.mimeType !== "image/jpeg") throw new Error(`Dimensões inválidas para ${width}x${height}.`);
}

const transparentPng = await sharp({ create: { width: 320, height: 640, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
if ((await inspectListingImage(transparentPng)).mimeType !== "image/png") throw new Error("PNG transparente não reconhecido.");

const webp = await sharp({ create: { width: 320, height: 640, channels: 3, background: "#000000" } }).webp().toBuffer();
if ((await inspectListingImage(webp)).mimeType !== "image/webp") throw new Error("WebP não reconhecido.");

const rotated = await sharp({ create: { width: 640, height: 960, channels: 3, background: "#000000" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
if ((await inspectListingImage(rotated)).orientation !== 6) throw new Error("Orientação EXIF não detectada.");

await expectRejected(Buffer.from("not-an-image"), "Arquivo inválido aceito.");
await expectRejected(await sharp({ create: { width: 32, height: 32, channels: 3, background: "#000000" } }).png().toBuffer(), "Imagem pequena aceita.");

const mediaSource = readFileSync("src/components/listing-media.tsx", "utf8");
for (const required of ["object-contain", "bg-black", "onError", "Imagem indisponível"]) {
  if (!mediaSource.includes(required)) throw new Error(`ListingMedia sem requisito: ${required}`);
}

const publicSurfaces = ["src/components/listing-card.tsx", "src/components/manual-listing-card.tsx", "src/components/listing-photo-gallery.tsx", "src/app/avulso/[id]/page.tsx"];
for (const path of publicSurfaces) {
  const source = readFileSync(path, "utf8");
  if (source.includes("object-cover")) throw new Error(`${path} ainda usa object-cover.`);
}

console.log("Listing media safety OK: proporções, formatos, EXIF, falhas e superfícies públicas validados.");
}

async function expectRejected(bytes: Buffer, message: string) {
  try { await inspectListingImage(bytes); } catch { return; }
  throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
