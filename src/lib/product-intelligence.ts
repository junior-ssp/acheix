import { categories } from "@/lib/constants";

export type ProductSuggestion = {
  category?: string;
  subcategory?: string;
  title?: string;
  brand?: string;
  predominantColor?: string;
  condition?: "Novo" | "Usado";
  confidence: number;
};

export type ProductModerationDecision = {
  status: "APPROVED" | "NEEDS_REVIEW" | "BLOCKED";
  riskScore: number;
  reasons: string[];
};

const allowedContextTerms = [
  "armacao de oculos",
  "armacao de telhado",
  "armacao de concreto",
  "armacao metalica",
  "armarinho",
  "remedio caseiro",
  "remedio para plantas",
  "receita caseira",
  "cha natural",
  "farmacia",
  "veterinario",
  "brinquedo"
];

const blockedPolicySignals: Array<{ code: string; pattern: RegExp }> = [
  { code: "WEAPON_FIREARM", pattern: /\b(arma de fogo|revolver|pistola|fuzil|espingarda|metralhadora|glock|calibre)\b/ },
  { code: "AMMUNITION", pattern: /\b(municao|municoes|cartucho|cartuchos)\b/ },
  { code: "EXPLOSIVE", pattern: /\b(explosivo|dinamite|granada|bomba caseira)\b/ },
  { code: "CONTROLLED_MEDICINE", pattern: /\b(mounjaro|ozempic|wegovy|sibutramina|anabolizante|hormonio|medicamento controlado|remedio controlado|receita medica falsa)\b/ },
  { code: "ILLEGAL_DRUG", pattern: /\b(cocaina|crack|maconha|lsd|ecstasy|droga ilicita)\b/ },
  { code: "ACCOUNT_RESALE", pattern: /\b(conta netflix|conta spotify|conta instagram|conta tiktok|iptv)\b/ },
  { code: "FRAUD_TOOL", pattern: /\b(hack|cheat|cartao clonado|clonagem|dados pessoais|documento falso|rg falso|cpf falso|cnh falsa|diploma falso)\b/ },
  { code: "ADULT_CONTENT", pattern: /\b(pornografia|conteudo adulto|sexo explicito|programa sexual)\b/ },
  { code: "STOLEN_GOODS", pattern: /\b(produto roubado|produto furtado|sem procedencia|carga roubada)\b/ }
];

const reviewPolicyTerms = [
  "arma",
  "remedio",
  "medicamento",
  "rg",
  "cpf",
  "cnh",
  "passaporte",
  "diploma",
  "sem nota",
  "sem origem",
  "desbloqueado",
  "imei",
  "joia",
  "relogio",
  "console",
  "notebook",
  "smartphone",
  "celular",
  "peca de moto",
  "autopeca",
  "bicicleta"
];

export async function identifyProduct(_images: Array<{ url: string }>): Promise<ProductSuggestion> {
  return { confidence: 0 };
}

export function moderateProductListing(input: {
  title: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  userRiskScore?: number | null;
}): ProductModerationDecision {
  const text = normalize([
    input.title,
    input.description,
    input.category,
    input.subcategory,
    input.brand,
    input.model
  ].filter(Boolean).join(" "));

  const allowedContext = allowedContextTerms.some((term) => text.includes(normalize(term)));
  const blocked = allowedContext ? [] : blockedPolicySignals.filter((signal) => signal.pattern.test(text)).map((signal) => signal.code);
  if (blocked.length) {
    return { status: "BLOCKED", riskScore: 90, reasons: blocked.slice(0, 5) };
  }

  const review = allowedContext ? [] : reviewPolicyTerms.filter((term) => text.includes(normalize(term)));
  const userRisk = Number(input.userRiskScore ?? 0);
  if (review.length || userRisk >= 105) {
    return { status: "NEEDS_REVIEW", riskScore: Math.max(45, Math.min(85, review.length * 18 + Math.floor(userRisk / 3))), reasons: review.slice(0, 5) };
  }

  return { status: "APPROVED", riskScore: 10, reasons: [] };
}

export function requiresProductOriginDeclaration(category: string, subcategory: string) {
  const text = normalize(`${category} ${subcategory}`);
  return [
    "celular",
    "telefone",
    "informatica",
    "notebook",
    "computador",
    "eletronico",
    "videogame",
    "pecas",
    "acessorios",
    "bicicleta",
    "joia",
    "relogio"
  ].some((term) => text.includes(term));
}

export function defaultProductSubcategory(category: string) {
  return categories.PRODUCT.includes(category as any) ? category : categories.PRODUCT[0];
}

export function inferProductCategoryFromText(input: string) {
  const text = normalize(input);
  if (!text) return null;
  const matches: Array<{ category: (typeof categories.PRODUCT)[number]; subcategory?: string; score: number }> = [
    { category: "Celulares e Telefones", subcategory: "Smartphones", score: score(text, ["iphone", "samsung", "xiaomi", "motorola", "celular", "smartphone", "telefone", "smartwatch"]) },
    { category: "Eletrodomésticos", score: score(text, ["geladeira", "fogao", "microondas", "micro-ondas", "maquina de lavar", "lavadora", "ar condicionado", "freezer", "batedeira", "liquidificador"]) },
    { category: "Móveis", score: score(text, ["sofa", "mesa", "cadeira", "guarda roupa", "guarda-roupa", "cama", "rack", "estante", "armario"]) },
    { category: "Informática", score: score(text, ["notebook", "computador", "pc gamer", "monitor", "impressora", "teclado", "mouse", "placa de video", "ssd", "roteador"]) },
    { category: "Casa e Decoração", score: score(text, ["decoracao", "quadro", "tapete", "cortina", "luminaria", "jardim", "vaso", "cama mesa banho"]) },
    { category: "Peças e Acessórios", score: score(text, ["pneu", "roda", "parachoque", "retrovisor", "escapamento", "peca", "autopeca", "acessorio de carro", "moto peca"]) },
    { category: "Eletrônicos", score: score(text, ["tv", "televisao", "som", "caixa de som", "home theater", "projetor", "receiver", "fone"]) },
    { category: "Games", subcategory: "Consoles", score: score(text, ["playstation", "ps4", "ps5", "xbox", "nintendo", "switch", "videogame", "jogo", "controle gamer"]) },
    { category: "Roupas e Calçados", score: score(text, ["roupa", "camisa", "camiseta", "calca", "vestido", "tenis", "sapato", "bolsa", "jaqueta"]) },
    { category: "Esporte e Lazer", score: score(text, ["bicicleta", "bike", "academia", "esteira", "halter", "camping", "barraca", "pesca", "bola"]) },
    { category: "Bebês e Crianças", score: score(text, ["bebe", "berco", "carrinho", "cadeirinha", "brinquedo", "infantil", "mamadeira"]) },
    { category: "Ferramentas", score: score(text, ["furadeira", "parafusadeira", "serra", "martelete", "chave", "alicate", "ferramenta", "compressor"]) },
    { category: "Beleza e Cuidados Pessoais", score: score(text, ["perfume", "cosmetico", "maquiagem", "secador", "chapinha", "barbeador", "cuidados pessoais"]) },
    { category: "Pets", score: score(text, ["pet", "cachorro", "gato", "aquario", "casinha", "comedouro", "coleira", "brinquedo pet"]) },
    { category: "Música e Instrumentos", score: score(text, ["violao", "guitarra", "baixo", "teclado", "piano", "bateria", "microfone", "mesa de som"]) },
    { category: "Câmeras e Drones", score: score(text, ["camera", "canon", "nikon", "sony alpha", "gopro", "drone", "lente", "dji"]) },
    { category: "Materiais de Construção", score: score(text, ["piso", "porta", "janela", "tinta", "louca", "ferragem", "cimento", "argamassa", "telha"]) },
    { category: "Escritório e Home Office", score: score(text, ["cadeira de escritorio", "mesa de escritorio", "home office", "arquivo", "scanner", "fragmentadora"]) },
    { category: "Hobbies e Colecionáveis", score: score(text, ["lego", "action figure", "miniatura", "moeda", "selo", "hq", "colecionavel"]) },
    { category: "Utilidades Domésticas", score: score(text, ["panela", "talher", "organizador", "utensilio", "pote", "faqueiro"]) }
  ];
  const best = matches.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best : null;
}

function score(text: string, terms: string[]) {
  return terms.reduce((total, term) => total + (text.includes(normalize(term)) ? 1 : 0), 0);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
