import { json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
type FipeVehicleType = "CAR" | "MOTORCYCLE" | "TRUCK";

export const dynamic = "force-dynamic";

type ParallelumModel = { codigo: string | number; nome: string };
type LiveModel = {
  provider: string;
  vehicleType: FipeVehicleType;
  brandName: string;
  brandExternalId: string;
  modelExternalId: string;
  fullName: string;
  fipeCode?: string | null;
  raw?: unknown;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const vehicleType = parseVehicleType(url.searchParams.get("vehicleType"));

  if (mode === "brands") {
    const [fipeBrands, manufacturers] = await Promise.all([
      findFipeBrands(vehicleType),
      findManufacturers(vehicleType)
    ]);

    const brands = [
      ...fipeBrands.map((brand) => ({ id: brand.id, name: brand.name, source: "FIPE" })),
      ...manufacturers.map((brand) => ({ id: `manufacturer:${brand.id}`, name: brand.name, source: brand.segment }))
    ];
    return json({ brands: uniqueByName(brands) });
  }

  if (mode === "models") {
    const brandId = url.searchParams.get("brandId");
    if (!brandId || brandId.startsWith("manufacturer:")) return json({ models: [] });
    const brand = await findFipeBrandById(brandId, vehicleType);
    const liveModels = brand ? await fetchLiveModels(vehicleType, brand.name) : [];
    if (liveModels.length) {
      void cacheLiveModels(liveModels).catch(() => null);
      return json({ models: uniqueByName(liveModels.map((model) => {
        const name = baseModelName(model.fullName);
        return { id: `base:${name}`, name };
      })) });
    }
    const models = await findFipeModels(brandId, vehicleType);
    return json({ models: uniqueByName(models.map((model) => {
      const name = baseModelName(model.name);
      return { id: `base:${name}`, name };
    })) });
  }

  if (mode === "versions") {
    const brandId = url.searchParams.get("brandId");
    const modelName = url.searchParams.get("modelName");
    if (!brandId || !modelName || brandId.startsWith("manufacturer:")) return json({ versions: [] });
    const brand = await findFipeBrandById(brandId, vehicleType);
    const liveModels = brand ? await fetchLiveModels(vehicleType, brand.name) : [];
    if (liveModels.length) {
      void cacheLiveModels(liveModels).catch(() => null);
      const wanted = normalizeName(modelName);
      const versions = liveModels
        .filter((model) => normalizeName(baseModelName(model.fullName)) === wanted)
        .map((model) => ({
          id: `live:${model.provider}:${model.vehicleType}:${encodeURIComponent(model.brandExternalId)}:${encodeURIComponent(model.modelExternalId)}`,
          name: versionName(model.fullName, modelName),
          fipeCode: null,
          fipeName: model.fullName,
          source: model.provider
        }));
      return json({ versions: uniqueByName(versions) });
    }
    const models = await findFipeModels(brandId, vehicleType);
    const wanted = normalizeName(modelName);
    const versions = models
      .filter((model) => normalizeName(baseModelName(model.name)) === wanted)
      .map((model) => ({
        id: model.id,
        name: versionName(model.name, modelName),
        fipeCode: model.fipeCode,
        fipeName: model.name
      }))
      .filter((model) => model.fipeCode || normalizeName(model.name) !== wanted);
    return json({ versions: uniqueByName(versions) });
  }

  if (mode === "years") {
    const modelId = url.searchParams.get("modelId");
    if (!modelId) return json({ years: [] });
    if (modelId.startsWith("parallelum:") || modelId.startsWith("live:")) {
      const years = await fetchLiveYears(modelId);
      return json({ years });
    }
    const prices = await findFipeYears(modelId);
    return json({ years: prices.map((item) => item.modelYear) });
  }

  return json({ error: "Modo invalido." }, 400);
}

function parseVehicleType(value: string | null): FipeVehicleType {
  if (value === "MOTORCYCLE" || value === "TRUCK" || value === "CAR") return value;
  return "CAR";
}

function apiPathFromVehicleType(vehicleType: FipeVehicleType) {
  if (vehicleType === "MOTORCYCLE") return "motos";
  if (vehicleType === "TRUCK") return "caminhoes";
  return "carros";
}

async function fetchParallelumModels(vehicleType: FipeVehicleType, brandName: string): Promise<LiveModel[]> {
  try {
    const apiPath = apiPathFromVehicleType(vehicleType);
    const brands = await requestParallelum<Array<{ codigo: string | number; nome: string }>>(`/${apiPath}/marcas`);
    const brand = findBestBrand(brands.map((item) => ({ code: item.codigo, name: item.nome })), brandName);
    if (!brand) return [];
    const payload = await requestParallelum<{ modelos: ParallelumModel[] }>(`/${apiPath}/marcas/${brand.code}/modelos`);
    return (payload.modelos ?? []).map((model) => ({
      provider: "parallelum",
      vehicleType,
      brandName: brand.name,
      brandExternalId: String(brand.code),
      modelExternalId: String(model.codigo),
      fullName: model.nome,
      raw: model
    }));
  } catch {
    return [];
  }
}

async function fetchLiveModels(vehicleType: FipeVehicleType, brandName: string) {
  for (const fetcher of [fetchParallelumV2Models, fetchParallelumModels, fetchBrasilApiModels, fetchFipexModels]) {
    const models = await fetcher(vehicleType, brandName);
    if (models.length) return models;
  }
  return [];
}

async function fetchParallelumV2Models(vehicleType: FipeVehicleType, brandName: string): Promise<LiveModel[]> {
  try {
    const apiPath = apiV2PathFromVehicleType(vehicleType);
    const brands = await requestJson<Array<{ code: string | number; name: string }>>(`https://fipe.parallelum.com.br/api/v2/${apiPath}/brands`);
    const brand = findBestBrand(brands.map((item) => ({ code: item.code, name: item.name })), brandName);
    if (!brand) return [];
    const models = await requestJson<Array<{ code: string | number; name: string }>>(`https://fipe.parallelum.com.br/api/v2/${apiPath}/brands/${brand.code}/models`);
    return models.map((model) => ({
      provider: "parallelum-v2",
      vehicleType,
      brandName: brand.name,
      brandExternalId: String(brand.code),
      modelExternalId: String(model.code),
      fullName: model.name,
      raw: model
    }));
  } catch {
    return [];
  }
}

async function fetchBrasilApiModels(vehicleType: FipeVehicleType, brandName: string): Promise<LiveModel[]> {
  try {
    const apiPath = brasilApiPathFromVehicleType(vehicleType);
    const brands = await requestJson<Array<{ codigo: string | number; nome: string }>>(`https://brasilapi.com.br/api/fipe/marcas/v1/${apiPath}`);
    const brand = findBestBrand(brands.map((item) => ({ code: item.codigo, name: item.nome })), brandName);
    if (!brand) return [];
    const vehicles = await requestJson<Array<Record<string, unknown>>>(`https://brasilapi.com.br/api/fipe/veiculos/v1/${apiPath}/${brand.code}`);
    return vehicles.map((item) => {
      const fipeCode = String(item.codigoFipe ?? item.codigo_fipe ?? item.codigo ?? "");
      const name = String(item.modelo ?? item.nome ?? item.name ?? "");
      return {
        provider: "brasilapi",
        vehicleType,
        brandName: brand.name,
        brandExternalId: String(brand.code),
        modelExternalId: fipeCode || normalizeExternalId(name),
        fullName: name,
        fipeCode: fipeCode || null,
        raw: item
      };
    }).filter((item) => item.fullName);
  } catch {
    return [];
  }
}

async function fetchFipexModels(vehicleType: FipeVehicleType, brandName: string): Promise<LiveModel[]> {
  try {
    const type = await findFipexType(vehicleType);
    const make = await findFipexMake(brandName);
    if (!make) return [];
    const searchUrl = new URL("https://api.fipex.com.br/v1/models");
    searchUrl.searchParams.set("limit", "50");
    searchUrl.searchParams.set("make_id", make.id);
    searchUrl.searchParams.set("order_by", "name");
    const payload = await requestJson<{ data?: Array<{ id: string; name: string }> }>(searchUrl.toString());
    const models = payload.data ?? [];
    return models
      .filter((model) => !type || true)
      .map((model) => ({
        provider: "fipex",
        vehicleType,
        brandName: make.name,
        brandExternalId: make.id,
        modelExternalId: model.id,
        fullName: model.name,
        raw: model
      }));
  } catch {
    return [];
  }
}

async function fetchLiveYears(modelId: string) {
  if (modelId.startsWith("live:")) {
    const [, provider, vehicleType, encodedBrandCode, encodedModelCode] = modelId.split(":");
    const brandCode = decodeURIComponent(encodedBrandCode ?? "");
    const modelCode = decodeURIComponent(encodedModelCode ?? "");
    if (provider === "parallelum-v2") return fetchParallelumV2Years(vehicleType as FipeVehicleType, brandCode, modelCode);
    if (provider === "parallelum") return fetchParallelumYears(`parallelum:${apiPathFromVehicleType(vehicleType as FipeVehicleType)}:${brandCode}:${modelCode}`);
    if (provider === "fipex") return fetchFipexYears(modelCode);
    return [];
  }
  return fetchParallelumYears(modelId);
}

async function fetchParallelumV2Years(vehicleType: FipeVehicleType, brandCode: string, modelCode: string) {
  try {
    const apiPath = apiV2PathFromVehicleType(vehicleType);
    const years = await requestJson<Array<{ code: string; name: string }>>(`https://fipe.parallelum.com.br/api/v2/${apiPath}/brands/${brandCode}/models/${modelCode}/years`);
    return parseYears(years);
  } catch {
    return [];
  }
}

async function fetchParallelumYears(modelId: string) {
  try {
    const [, apiPath, brandCode, modelCode] = modelId.split(":");
    if (!apiPath || !brandCode || !modelCode) return [];
    const years = await requestParallelum<Array<{ codigo: string; nome: string }>>(`/${apiPath}/marcas/${brandCode}/modelos/${modelCode}/anos`);
    return parseYears(years);
  } catch {
    return [];
  }
}

async function fetchFipexYears(modelCode: string) {
  try {
    const payload = await requestJson<{ years?: Array<{ model_year?: number; is_zero_km?: boolean }> }>(`https://api.fipex.com.br/v1/models/${modelCode}/years`);
    const years = payload.years ?? [];
    return [...new Set(years.map((year) => year.is_zero_km ? new Date().getFullYear() : year.model_year).filter((year): year is number => Boolean(year && year > 1900)))].sort((a, b) => b - a);
  } catch {
    return [];
  }
}

async function requestParallelum<T>(path: string): Promise<T> {
  return requestJson<T>(`https://parallelum.com.br/fipe/api/v1${path}`);
}

async function requestJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "Achei X catalog lookup" },
      signal: controller.signal,
      next: { revalidate: 86400 }
    });
    if (!response.ok) throw new Error(`FIPE request failed: ${response.status} ${url}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function cacheLiveModels(models: LiveModel[]) {
  const groups = new Map<string, LiveModel[]>();
  for (const item of models.slice(0, 800)) {
    const key = [item.provider, item.vehicleType, item.brandExternalId].join(":");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  for (const groupModels of groups.values()) {
    const first = groupModels[0];
    if (!first) continue;
    const brand = await findOrCreateFipeBrand(first);
    await db().from("FipeBrand").update({
      name: first.brandName,
      normalizedName: normalizeName(first.brandName),
      updatedAt: new Date().toISOString()
    }).eq("id", brand.id);

    for (const item of groupModels) {
      const { error } = await db().from("FipeModel").upsert({
        id: newDbId(),
        provider: item.provider,
        brandId: brand.id,
        externalId: item.modelExternalId,
        fipeCode: item.fipeCode ?? null,
        name: item.fullName,
        normalizedName: normalizeName(item.fullName),
        updatedAt: new Date().toISOString()
      }, { onConflict: "brandId,externalId", ignoreDuplicates: false });
      throwDbError(error);
    }
  }
}

async function findFipeBrands(vehicleType: FipeVehicleType) {
  const { data, error } = await db()
    .from("FipeBrand")
    .select("id,name")
    .eq("vehicleType", vehicleType)
    .order("name", { ascending: true })
    .limit(500);
  throwDbError(error);
  return (data ?? []) as Array<{ id: string; name: string }>;
}

async function findManufacturers(vehicleType: FipeVehicleType) {
  let query = db().from("VehicleManufacturer").select("id,name,segment").eq("active", true).order("name", { ascending: true });
  if (vehicleType === "CAR") query = query.eq("segment", "Veículos Elétricos");
  if (vehicleType === "TRUCK") query = query.in("segment", ["Ônibus", "Máquinas Agrícolas"]);
  if (vehicleType === "MOTORCYCLE") query = query.eq("segment", "__NONE__");
  const { data, error } = await query;
  throwDbError(error);
  return (data ?? []) as Array<{ id: string; name: string; segment: string }>;
}

async function findFipeBrandById(id: string, vehicleType: FipeVehicleType) {
  const { data, error } = await db().from("FipeBrand").select("id,name").eq("id", id).eq("vehicleType", vehicleType).maybeSingle();
  throwDbError(error);
  return data as { id: string; name: string } | null;
}

async function findFipeModels(brandId: string, vehicleType: FipeVehicleType) {
  const brand = await findFipeBrandById(brandId, vehicleType);
  if (!brand) return [];
  const { data, error } = await db().from("FipeModel").select("id,name,fipeCode").eq("brandId", brandId).order("name", { ascending: true }).limit(800);
  throwDbError(error);
  return (data ?? []) as Array<{ id: string; name: string; fipeCode: string | null }>;
}

async function findFipeYears(modelId: string) {
  const { data, error } = await db().from("FipeVehiclePrice").select("modelYear").eq("modelId", modelId).order("modelYear", { ascending: false }).limit(80);
  throwDbError(error);
  const years = [...new Set(((data ?? []) as Array<{ modelYear: number }>).map((item) => item.modelYear))];
  return years.map((modelYear) => ({ modelYear }));
}

async function findOrCreateFipeBrand(item: LiveModel) {
  const normalizedName = normalizeName(item.brandName);
  const { data: existing, error: existingError } = await db()
    .from("FipeBrand")
    .select("*")
    .eq("provider", item.provider)
    .eq("vehicleType", item.vehicleType)
    .or(`externalId.eq.${item.brandExternalId},normalizedName.eq.${normalizedName}`)
    .limit(1);
  throwDbError(existingError);
  const current = existing?.[0];
  if (current) return current as any;
  const { data, error } = await db().from("FipeBrand").insert({
    id: newDbId(),
    provider: item.provider,
    vehicleType: item.vehicleType,
    externalId: item.brandExternalId,
    name: item.brandName,
    normalizedName,
    updatedAt: new Date().toISOString()
  }).select("*").single();
  throwDbError(error);
  return data as any;
}

function parseYears(years: Array<{ codigo?: string; nome?: string; code?: string; name?: string }>) {
  const parsed = years
    .map((year) => Number.parseInt(String(year.nome ?? year.name ?? year.codigo ?? year.code), 10))
    .filter((year) => Number.isInteger(year) && year > 1900);
  return [...new Set(parsed)].sort((a, b) => b - a);
}

function findBestBrand(brands: Array<{ code: string | number; name: string }>, brandName: string) {
  const wanted = normalizeBrandName(brandName);
  return brands.find((brand) => normalizeBrandName(brand.name) === wanted)
    ?? brands.find((brand) => normalizeBrandName(brand.name).includes(wanted) || wanted.includes(normalizeBrandName(brand.name)));
}

function apiV2PathFromVehicleType(vehicleType: FipeVehicleType) {
  if (vehicleType === "MOTORCYCLE") return "motorcycles";
  if (vehicleType === "TRUCK") return "trucks";
  return "cars";
}

function brasilApiPathFromVehicleType(vehicleType: FipeVehicleType) {
  if (vehicleType === "MOTORCYCLE") return "motos";
  if (vehicleType === "TRUCK") return "caminhoes";
  return "carros";
}

async function findFipexMake(brandName: string) {
  const url = new URL("https://api.fipex.com.br/v1/makes");
  url.searchParams.set("limit", "50");
  url.searchParams.set("q", brandName);
  const payload = await requestJson<{ data?: Array<{ id: string; name: string }> }>(url.toString());
  return findBestBrand((payload.data ?? []).map((make) => ({ code: make.id, name: make.name })), brandName) as { code: string; name: string } | undefined
    ? { id: String((findBestBrand((payload.data ?? []).map((make) => ({ code: make.id, name: make.name })), brandName) as { code: string | number; name: string }).code), name: (findBestBrand((payload.data ?? []).map((make) => ({ code: make.id, name: make.name })), brandName) as { code: string | number; name: string }).name }
    : null;
}

async function findFipexType(vehicleType: FipeVehicleType) {
  try {
    const payload = await requestJson<{ data?: Array<{ id: string; slug: string; name: string }> }>("https://api.fipex.com.br/v1/types?limit=50");
    const slug = apiV2PathFromVehicleType(vehicleType);
    return (payload.data ?? []).find((type) => type.slug === slug);
  } catch {
    return null;
  }
}

function uniqueByName<T extends { name: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function baseModelName(name: string) {
  const cleaned = name.replace(/\s+/g, " ").trim();
  const upper = cleaned.toUpperCase();
  const multiWordPrefixes = [
    "GRAND SIENA",
    "CRONOS DRIVE",
    "COROLLA CROSS",
    "RANGE ROVER",
    "DISCOVERY SPORT",
    "BRONCO SPORT",
    "DOLPHIN MINI",
    "SONG PLUS",
    "SONG PRO",
    "HAVAL H6",
    "C3 AIRCROSS",
    "C4 CACTUS",
    "C4 LOUNGE",
    "T-CROSS",
    "POLO SEDAN",
    "GOLF VARIANT",
    "SPACE FOX",
    "SPACEFOX",
    "CARGO",
    "SPRINTER",
    "DAILY",
    "CITYCLASS"
  ];
  const prefix = multiWordPrefixes.find((item) => upper === item || upper.startsWith(`${item} `));
  if (prefix) return cleaned.slice(0, prefix.length);
  const tokens = cleaned.split(/[\s/]+/).filter(Boolean);
  if (tokens.length >= 2 && isModelBodyToken(tokens[1])) return `${tokens[0]} ${tokens[1]}`;
  return tokens[0] || cleaned;
}

function versionName(fipeName: string, modelName: string) {
  const escapedModel = modelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutModel = fipeName
    .replace(new RegExp(`^${escapedModel}\\b`, "i"), "")
    .replace(/^[-/\s.]+/, "")
    .trim();
  return withoutModel || fipeName;
}

function isModelBodyToken(value: string) {
  return [
    "HATCH",
    "HATCHBACK",
    "SEDAN",
    "SW",
    "WAGON",
    "WEEKEND",
    "COUPE",
    "CABRIO",
    "CONVERSIVEL",
    "FASTBACK",
    "PICK-UP",
    "PICKUP",
    "VAN",
    "MINIVAN",
    "SPORTBACK",
    "VARIANT"
  ].includes(normalizeName(value).toUpperCase());
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeBrandName(value: string) {
  return normalizeName(value)
    .replace(/\b(vw|volkswagen)\b/g, "volkswagen")
    .replace(/\bmb\b/g, "mercedes benz")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeExternalId(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}


