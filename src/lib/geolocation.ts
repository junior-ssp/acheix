export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRadiusKm(from: Coordinates, to: Coordinates, radiusKm: number) {
  return distanceKm(from, to) <= radiusKm;
}

export async function geocodeAddressStandby(_address: string) {
  if (!process.env.GEOCODING_PROVIDER_URL || !process.env.GEOCODING_PROVIDER_TOKEN) {
    return null;
  }
  return null;
}

export async function geocodeFreeformBrazilAddress(address: string): Promise<CepGeocode | null> {
  const value = String(address ?? "").trim();
  if (value.length < 5) return null;
  const coordinates = await geocodeBrazilAddress({ address: value });
  if (coordinates.latitude === undefined || coordinates.longitude === undefined) return null;
  return { address: value, ...coordinates };
}

export type CepGeocode = {
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
};

export async function lookupCepWithCoordinates(cep: string): Promise<CepGeocode | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const brasilApi = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, { cache: "no-store" })
    .then(async (response) => response.ok ? response.json() : null)
    .catch(() => null);

  if (brasilApi?.city && brasilApi?.state) {
    const coordinates = brasilApi.location?.coordinates;
    const result = {
      address: brasilApi.street,
      city: brasilApi.city,
      district: brasilApi.neighborhood,
      state: brasilApi.state,
      latitude: toNumber(coordinates?.latitude),
      longitude: toNumber(coordinates?.longitude)
    };
    if (result.latitude !== undefined && result.longitude !== undefined) return result;
    const geocoded = await geocodeBrazilAddress(result);
    return { ...result, ...geocoded };
  }

  const viaCep = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { cache: "no-store" })
    .then(async (response) => response.ok ? response.json() : null)
    .catch(() => null);

  if (!viaCep || viaCep.erro) return null;

  const result = {
    address: viaCep.logradouro,
    city: viaCep.localidade,
    district: viaCep.bairro,
    state: viaCep.uf
  };
  const geocoded = await geocodeBrazilAddress(result);
  return { ...result, ...geocoded };
}

export function parseRadiusKm(value: string | null | undefined, fallback = 10) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return fallback;
  return Math.min(Math.max(radius, 1), 50);
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

async function geocodeBrazilAddress(input: CepGeocode): Promise<Pick<CepGeocode, "latitude" | "longitude">> {
  const queries = [
    [input.address, input.district, input.city, input.state, "Brasil"],
    [input.district, input.city, input.state, "Brasil"],
    [input.city, input.state, "Brasil"]
  ]
    .map((parts) => parts.filter(Boolean).join(", "))
    .filter(Boolean);

  for (const query of queries) {
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      countrycodes: "br",
      q: query
    });

    const data = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      cache: "force-cache",
      headers: {
        "accept-language": "pt-BR",
        "user-agent": "AcheiX/1.0 contato@acheix.com.br"
      },
      next: { revalidate: 60 * 60 * 24 * 30 }
    })
      .then(async (response) => response.ok ? response.json() : null)
      .catch(() => null);

    const first = Array.isArray(data) ? data[0] : null;
    const latitude = toNumber(first?.lat);
    const longitude = toNumber(first?.lon);
    if (latitude !== undefined && longitude !== undefined) return { latitude, longitude };
  }

  return {};
}
