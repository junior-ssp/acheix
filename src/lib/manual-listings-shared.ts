import { onlyDigits } from "@/lib/formatters";

export type ManualListingCategory = "VEHICLE" | "REAL_ESTATE" | "COMPANY" | "SERVICE" | "PRODUCT";

export type ManualListing = {
  id: string; ownerId: string; title: string; address: string; priceCents: number | null;
  phone: string; tollFree: string; whatsapp: string; whatsapp2: string;
  website: string | null; facebook: string | null; instagram: string | null;
  youtube: string | null; tiktok: string | null; vidiu: string | null;
  category: ManualListingCategory; durationDays: number; expiresAt: string;
  contactClickCount: number; lastTopRefreshAt: string | null; nextTopRefreshAt: string;
  createdAt: string; updatedAt: string;
  photos: Array<{ id: string; url: string; alt: string | null; order: number }>;
};

export const manualListingDurations = [7, 15, 30, 90, 180, 365] as const;
export const manualListingCategories: Array<{ value: ManualListingCategory; label: string }> = [
  { value: "VEHICLE", label: "Veículos" }, { value: "REAL_ESTATE", label: "Imóveis" },
  { value: "PRODUCT", label: "Produtos" }, { value: "COMPANY", label: "Empresas" },
  { value: "SERVICE", label: "Serviços" }
];

const emptyTitle = "Anúncio Avulso";
const emptyAddress = "Endereço não informado";
const emptyPhone = "Não informado";

export function displayManualListingTitle(value: string | null | undefined) { const text = String(value ?? "").trim(); return text && text !== emptyTitle ? text : emptyTitle; }
export function displayManualListingAddress(value: string | null | undefined) { const text = String(value ?? "").trim(); return text && text !== emptyAddress ? text : ""; }
export function editableManualListingTitle(value: string | null | undefined) { const text = String(value ?? "").trim(); return text === emptyTitle ? "" : text; }
export function editableManualListingAddress(value: string | null | undefined) { const text = String(value ?? "").trim(); return text === emptyAddress ? "" : text; }
export function editableManualListingPhone(value: string | null | undefined) { const text = String(value ?? "").trim(); return text === emptyPhone ? "" : text; }
export function editableManualListingWhatsapp(value: string | null | undefined) { const text = String(value ?? "").trim(); return text === emptyPhone ? "" : text; }
export function manualListingPhoneUrl(value: string | null | undefined) { const digits = onlyDigits(value); return digits.length >= 8 ? `tel:${digits}` : ""; }
export function manualListingWhatsappUrl(whatsapp: string, phone: string, title: string) {
  const digits = onlyDigits(whatsapp) || onlyDigits(phone); if (digits.length < 10) return "";
  const normalized = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Vi no Achei X o anúncio "${displayManualListingTitle(title)}" e gostaria de conversar.`)}`;
}
