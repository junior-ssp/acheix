export type ServiceAudience = "VEHICLE" | "REAL_ESTATE";

export type ServiceCategoryOption = {
  slug: string;
  name: string;
  group: string;
  icon: string;
  audience: ServiceAudience;
};

export const serviceAudiences: Array<{ value: ServiceAudience; label: string }> = [
  { value: "VEHICLE", label: "Serviços para Veículos" },
  { value: "REAL_ESTATE", label: "Serviços para Imóveis e Casa" }
];

export const defaultServiceCategories: ServiceCategoryOption[] = [
  { slug: "mecanico-automotivo", name: "Mecânico Automotivo", group: "Mecânica e Manutenção", icon: "wrench", audience: "VEHICLE" },
  { slug: "centro-automotivo", name: "Centro Automotivo", group: "Mecânica e Manutenção", icon: "wrench", audience: "VEHICLE" },
  { slug: "troca-oleo", name: "Troca de Óleo", group: "Mecânica e Manutenção", icon: "droplet", audience: "VEHICLE" },
  { slug: "alinhamento-balanceamento", name: "Alinhamento e Balanceamento", group: "Pneus e Rodas", icon: "circle", audience: "VEHICLE" },
  { slug: "auto-eletrica", name: "Auto Elétrica", group: "Elétrica e Eletrônica", icon: "zap", audience: "VEHICLE" },
  { slug: "chaveiro-automotivo", name: "Chaveiro Automotivo", group: "Elétrica e Eletrônica", icon: "key-round", audience: "VEHICLE" },
  { slug: "borracharia", name: "Borracharia", group: "Pneus e Rodas", icon: "circle", audience: "VEHICLE" },
  { slug: "funilaria-pintura", name: "Funilaria e Pintura", group: "Funilaria e Estética", icon: "paint-roller", audience: "VEHICLE" },
  { slug: "martelinho-ouro", name: "Martelinho de Ouro", group: "Funilaria e Estética", icon: "hammer", audience: "VEHICLE" },
  { slug: "lava-rapido", name: "Lava Rápido", group: "Funilaria e Estética", icon: "sparkles", audience: "VEHICLE" },
  { slug: "ar-condicionado-automotivo", name: "Ar-Condicionado Automotivo", group: "Conforto", icon: "snowflake", audience: "VEHICLE" },
  { slug: "autopecas", name: "Autopeças", group: "Peças e Acessórios", icon: "settings", audience: "VEHICLE" },
  { slug: "guincho", name: "Guincho", group: "Socorro e Emergência", icon: "truck", audience: "VEHICLE" },
  { slug: "despachante-veicular", name: "Despachante Veicular", group: "Documentação", icon: "file-text", audience: "VEHICLE" },
  { slug: "oficina-motos", name: "Oficina de Motos", group: "Motocicletas", icon: "bike", audience: "VEHICLE" },

  { slug: "corretor-imoveis", name: "Corretor de Imóveis", group: "Compra, Venda e Locação", icon: "home", audience: "REAL_ESTATE" },
  { slug: "imobiliaria", name: "Imobiliária", group: "Compra, Venda e Locação", icon: "building", audience: "REAL_ESTATE" },
  { slug: "avaliador-imoveis", name: "Avaliador de Imóveis", group: "Compra, Venda e Locação", icon: "clipboard-check", audience: "REAL_ESTATE" },
  { slug: "advogado-imobiliario", name: "Advogado Imobiliário", group: "Jurídico", icon: "scale", audience: "REAL_ESTATE" },
  { slug: "regularizacao-imoveis", name: "Regularização de Imóveis", group: "Documentação", icon: "file-check", audience: "REAL_ESTATE" },
  { slug: "pedreiro", name: "Pedreiro", group: "Construção", icon: "hard-hat", audience: "REAL_ESTATE" },
  { slug: "empreiteira", name: "Empreiteira", group: "Construção", icon: "hard-hat", audience: "REAL_ESTATE" },
  { slug: "eletricista", name: "Eletricista", group: "Instalações", icon: "zap", audience: "REAL_ESTATE" },
  { slug: "encanador", name: "Encanador", group: "Instalações", icon: "pipe", audience: "REAL_ESTATE" },
  { slug: "pintor", name: "Pintor", group: "Reforma e Acabamento", icon: "paint-roller", audience: "REAL_ESTATE" },
  { slug: "gesseiro", name: "Gesseiro", group: "Reforma e Acabamento", icon: "panel-top", audience: "REAL_ESTATE" },
  { slug: "marceneiro", name: "Marceneiro", group: "Móveis e Estruturas", icon: "hammer", audience: "REAL_ESTATE" },
  { slug: "serralheria", name: "Serralheria", group: "Móveis e Estruturas", icon: "hammer", audience: "REAL_ESTATE" },
  { slug: "vidracaria", name: "Vidraçaria", group: "Móveis e Estruturas", icon: "square", audience: "REAL_ESTATE" },
  { slug: "jardineiro", name: "Jardineiro", group: "Área Externa", icon: "leaf", audience: "REAL_ESTATE" },
  { slug: "piscinas", name: "Limpeza de Piscinas", group: "Área Externa", icon: "waves", audience: "REAL_ESTATE" },
  { slug: "diarista", name: "Diarista", group: "Limpeza e Conservação", icon: "sparkles", audience: "REAL_ESTATE" },
  { slug: "faxina-residencial", name: "Faxina Residencial", group: "Limpeza e Conservação", icon: "sparkles", audience: "REAL_ESTATE" },
  { slug: "dedetizacao", name: "Dedetização", group: "Limpeza e Conservação", icon: "shield", audience: "REAL_ESTATE" },
  { slug: "ar-condicionado", name: "Ar-Condicionado", group: "Climatização", icon: "snowflake", audience: "REAL_ESTATE" },
  { slug: "energia-solar", name: "Instalador de Energia Solar", group: "Instalações", icon: "sun", audience: "REAL_ESTATE" },
  { slug: "mudancas", name: "Mudanças", group: "Mudanças", icon: "truck", audience: "REAL_ESTATE" },
  { slug: "fretes", name: "Fretes", group: "Mudanças", icon: "truck", audience: "REAL_ESTATE" },
  { slug: "fotografia-imobiliaria", name: "Fotografia Imobiliária", group: "Marketing Imobiliário", icon: "camera", audience: "REAL_ESTATE" },
  { slug: "sindico-profissional", name: "Síndico Profissional", group: "Condomínios", icon: "building-2", audience: "REAL_ESTATE" }
];

export const serviceCatalog: Record<ServiceAudience, Array<{ group: string; services: string[] }>> = {
  VEHICLE: groupByAudience("VEHICLE"),
  REAL_ESTATE: groupByAudience("REAL_ESTATE")
};

export function allServiceNames() {
  return defaultServiceCategories.map((category) => category.name);
}

export function normalizeServiceSlug(value: string) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("mecanico")) return "mecanico-automotivo";
  if (normalized.includes("corretor") && normalized.includes("imove")) return "corretor-imoveis";
  if (normalized.includes("auto") && normalized.includes("eletrica")) return "auto-eletrica";
  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function iconForService(value: string) {
  const slug = normalizeServiceSlug(value);
  return defaultServiceCategories.find((category) => category.slug === slug || normalizeServiceSlug(category.name) === slug)?.icon ?? "briefcase-business";
}

export function audienceForService(value: string): ServiceAudience | null {
  const slug = normalizeServiceSlug(value);
  return defaultServiceCategories.find((category) => category.slug === slug || normalizeServiceSlug(category.name) === slug)?.audience ?? null;
}

export function serviceMatchesAudience(value: string, audience?: string) {
  if (audience !== "VEHICLE" && audience !== "REAL_ESTATE") return true;
  return audienceForService(value) === audience;
}

function groupByAudience(audience: ServiceAudience) {
  const groups = new Map<string, string[]>();
  for (const item of defaultServiceCategories.filter((category) => category.audience === audience).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item.name]);
  }
  return Array.from(groups.entries()).map(([group, services]) => ({ group, services }));
}
