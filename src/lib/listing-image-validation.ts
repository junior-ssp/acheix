export type ListingImageInspection = {
  width: number;
  height: number;
  mimeType: string;
  orientation: number | null;
};

export async function inspectListingImage(bytes: Buffer): Promise<ListingImageInspection> {
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
  const mimeTypes: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", heif: "image/heif" };
  const mimeType = metadata.format ? mimeTypes[metadata.format] : undefined;
  const width = Number(metadata.width ?? 0);
  const height = Number(metadata.height ?? 0);
  if (!mimeType) throw new Error("Formato não permitido. Use JPG, PNG, WebP, AVIF ou HEIC/HEIF compatível.");
  if (width < 64 || height < 64) throw new Error("A imagem é pequena demais. Use pelo menos 64 × 64 pixels.");
  if (width > 12_000 || height > 12_000 || width * height > 40_000_000) throw new Error("A resolução da imagem é alta demais. Reduza a imagem e tente novamente.");
  return { width, height, mimeType, orientation: metadata.orientation ?? null };
}
