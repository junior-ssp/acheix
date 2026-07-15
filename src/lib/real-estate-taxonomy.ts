export const realEstatePurposes = ["SALE", "RENT", "SEASON"] as const;
export type RealEstatePurpose = (typeof realEstatePurposes)[number];

export const realEstatePurposeLabels: Record<RealEstatePurpose, string> = { SALE: "Venda", RENT: "Locação", SEASON: "Temporada" };

const saleAndRentTypes = ["Casa", "Apartamento", "Sobrado", "Cobertura", "Kitnet", "Studio", "Loft", "Flat", "Terreno", "Chácara", "Sítio", "Fazenda", "Haras", "Sala Comercial", "Loja", "Ponto Comercial", "Casa Comercial", "Galpão", "Armazém", "Prédio Comercial"] as const;
const seasonTypes = ["Casa", "Apartamento", "Cobertura", "Kitnet", "Studio", "Loft", "Flat", "Chalé", "Cabana", "Chácara", "Sítio", "Fazenda", "Hotel Fazenda", "Pousada", "Hotel", "Hostel", "Resort", "Bangalô", "Quarto", "Suíte"] as const;

export const realEstateTypesByPurpose: Record<RealEstatePurpose, readonly string[]> = { SALE: saleAndRentTypes, RENT: saleAndRentTypes, SEASON: seasonTypes };
export const allRealEstateTypes = [...new Set([...saleAndRentTypes, ...seasonTypes, "Apto"])] as string[];

export function normalizeRealEstatePurpose(value: unknown): RealEstatePurpose | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "SALE" || normalized === "VENDA") return "SALE";
  if (["RENT", "LOCA\u00c7\u00c3O", "LOCACAO", "ALUGUEL"].includes(normalized)) return "RENT";
  if (normalized === "SEASON" || normalized === "TEMPORADA") return "SEASON";
  return null;
}

export function realEstatePurposeLabel(value: unknown) {
  const purpose = normalizeRealEstatePurpose(value);
  return purpose ? realEstatePurposeLabels[purpose] : null;
}

export function realEstateTypeOptions(purpose: unknown) {
  const normalized = normalizeRealEstatePurpose(purpose);
  return normalized ? realEstateTypesByPurpose[normalized] : [];
}

export function isRealEstateTypeAllowed(purpose: unknown, type: unknown) { return realEstateTypeOptions(purpose).includes(String(type)); }
export function purposeSlug(value: RealEstatePurpose) { return value === "SALE" ? "venda" : value === "RENT" ? "locacao" : "temporada"; }
export function purposeFromSlug(value: string) { return value === "venda" ? "SALE" : value === "locacao" ? "RENT" : value === "temporada" ? "SEASON" : null; }
export function realEstateTypeSlug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export function realEstateTypeFromSlug(purpose: RealEstatePurpose, slug: string) { return realEstateTypesByPurpose[purpose].find((type) => realEstateTypeSlug(type) === slug) ?? null; }
