import { parseServiceComplement } from "@/lib/service-contact-disclosure";

type ServiceLocationLike = {
  city?: unknown;
  state?: unknown;
};

export function publicServiceAreas(city?: string | null, state?: string | null, complement?: string | null) {
  const parsed = parseServiceComplement(complement);
  const locations = Array.isArray(parsed.serviceLocations) ? parsed.serviceLocations as ServiceLocationLike[] : [];
  const labels = locations
    .map((location) => serviceAreaLabel(location.city, location.state))
    .filter((label): label is string => Boolean(label));

  const fallback = serviceAreaLabel(city, state);
  if (fallback) labels.push(fallback);

  return [...new Set(labels)].slice(0, 5);
}

export function publicServiceAreaText(areas: string[]) {
  return areas.length ? `Atende: ${areas.join(", ")}` : "Área de atendimento sob consulta";
}

function serviceAreaLabel(city?: unknown, state?: unknown) {
  const cleanCity = String(city ?? "").trim();
  const cleanState = String(state ?? "").trim().toUpperCase();
  if (cleanCity && cleanState) return `${cleanCity}/${cleanState}`;
  if (cleanCity) return cleanCity;
  if (cleanState) return cleanState;
  return "";
}
