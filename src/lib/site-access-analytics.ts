import { createHmac, createHash } from "node:crypto";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

const dedupeWindowMs = 30 * 60 * 1000;
const maxPathLength = 300;
const maxUserAgentLength = 500;

const brazilStates: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins"
};

export type SiteAccessStateStat = {
  state_code: string;
  state_name: string;
  access_count: number;
  percentage: number;
};

export type SiteAccessStats = {
  total: number;
  statesWithAccess: number;
  topState: SiteAccessStateStat | null;
  states: SiteAccessStateStat[];
};

export async function recordSiteAccess(input: { request: Request; pagePath: string }) {
  const pagePath = normalizePagePath(input.pagePath);
  if (!pagePath || shouldIgnorePath(pagePath)) return { recorded: false, reason: "ignored_path" };

  const headers = input.request.headers;
  const userAgent = truncate(headers.get("user-agent") ?? "", maxUserAgentLength);
  const ipHash = hashIp(extractIp(headers), userAgent);
  const geo = extractGeo(headers);
  const windowBucket = Math.floor(Date.now() / dedupeWindowMs);
  const dedupeKey = createHash("sha256")
    .update(`${ipHash}:${pagePath}:${windowBucket}`)
    .digest("hex");

  const { error } = await db().from("site_access_logs").insert({
    id: newDbId(),
    page_path: pagePath,
    ip_hash: ipHash,
    user_agent: userAgent || null,
    state_code: geo.stateCode,
    state_name: geo.stateName,
    city: geo.city,
    country: geo.country,
    dedupe_key: dedupeKey
  });

  if (isUniqueViolation(error)) return { recorded: false, reason: "duplicate_window" };
  throwDbError(error);
  return { recorded: true };
}

export async function getSiteAccessStats(): Promise<SiteAccessStats> {
  const { data, error } = await db().rpc("admin_site_access_stats");
  throwDbError(error);
  return normalizeStats(data);
}

function normalizePagePath(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "";
  const pathOnly = raw.split("#")[0].split("?")[0] || "/";
  return truncate(pathOnly, maxPathLength);
}

function shouldIgnorePath(path: string) {
  return (
    path.startsWith("/api/") ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path.startsWith("/_next/")
  );
}

function extractIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown";
}

function hashIp(ip: string, userAgent: string) {
  const secret = process.env.SITE_ACCESS_HASH_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "achei-x-site-access";
  return createHmac("sha256", secret)
    .update(`${ip}:${userAgent.slice(0, 120)}`)
    .digest("hex");
}

function extractGeo(headers: Headers) {
  const country = normalizeCountry(
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country")
  );
  const rawRegion =
    headers.get("x-vercel-ip-country-region") ||
    headers.get("x-vercel-ip-region") ||
    headers.get("cf-region-code") ||
    headers.get("x-region");
  const stateCode = country === "BR" ? normalizeStateCode(rawRegion) : null;
  return {
    country,
    stateCode,
    stateName: stateCode ? brazilStates[stateCode] : null,
    city: decodeHeaderValue(headers.get("x-vercel-ip-city") || headers.get("cf-ipcity") || headers.get("x-city"))
  };
}

function normalizeCountry(value: string | null) {
  const country = String(value ?? "").trim().toUpperCase();
  return country || null;
}

function normalizeStateCode(value: string | null) {
  const code = String(value ?? "").trim().toUpperCase();
  return brazilStates[code] ? code : null;
}

function decodeHeaderValue(value: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try {
    return truncate(decodeURIComponent(text.replace(/\+/g, " ")), 120);
  } catch {
    return truncate(text, 120);
  }
}

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");
}

function normalizeStats(value: any): SiteAccessStats {
  const states: SiteAccessStateStat[] = Array.isArray(value?.states)
    ? value.states.map(normalizeStateStat).filter(Boolean)
    : [];
  const topState = value?.topState && value.topState !== null ? normalizeStateStat(value.topState) : null;
  return {
    total: Number(value?.total ?? 0),
    statesWithAccess: Number(value?.statesWithAccess ?? states.filter((state) => state.access_count > 0).length),
    topState,
    states
  };
}

function normalizeStateStat(value: any): SiteAccessStateStat {
  return {
    state_code: String(value?.state_code ?? ""),
    state_name: String(value?.state_name ?? ""),
    access_count: Number(value?.access_count ?? 0),
    percentage: Number(value?.percentage ?? 0)
  };
}
