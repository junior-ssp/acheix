const productionAppUrl = "https://acheix.com.br";

export function getPublicAppBaseUrl(request?: Request) {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    request?.headers.get("origin"),
    forwardedBaseUrl(request),
    process.env.CAP_SERVER_URL
  ];

  const baseUrl = candidates
    .map((value) => normalizeUrl(value))
    .find((value) => value && !isLocalOrInvalidUrl(value));

  if (baseUrl) return baseUrl;
  if (process.env.NODE_ENV === "production") return productionAppUrl;
  return normalizeUrl(process.env.CAP_SERVER_URL) ?? "http://localhost:3000";
}

function forwardedBaseUrl(request?: Request) {
  if (!request) return undefined;
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  return forwardedHost
    ? `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`
    : undefined;
}

function normalizeUrl(value?: string | null) {
  const trimmed = value?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "");
  return trimmed || undefined;
}

function isLocalOrInvalidUrl(value: string) {
  return (
    value.includes("localhost") ||
    value.includes("127.0.0.1") ||
    value.endsWith("/null") ||
    value === "null"
  );
}
