const fallbackListingImage = "/achei-x-logo.png";

export function normalizeImageUrl(value?: string | null, fallback = fallbackListingImage) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  try {
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed).toString();
    if (trimmed.startsWith("/")) return encodeURI(trimmed);
  } catch {
    return fallback;
  }

  return fallback;
}

export function absolutePublicUrl(value: string, baseUrl = publicBaseUrl()) {
  const normalized = normalizeImageUrl(value, value);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${baseUrl.replace(/\/$/, "")}/${normalized.replace(/^\//, "")}`;
}

export function optimizedOpenGraphImageUrl(value?: string | null) {
  const imageUrl = absolutePublicUrl(normalizeImageUrl(value));
  return `${publicBaseUrl().replace(/\/$/, "")}/_next/image?url=${encodeURIComponent(imageUrl)}&w=1200&q=75`;
}

export function imageContentType(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".webp")) return "image/webp";
  } catch {
    return "image/jpeg";
  }
  return "image/jpeg";
}

function publicBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://acheix.com.br";
}
