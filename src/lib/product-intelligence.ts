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
  "cha natural"
];

const blockedPolicySignals: Array<{ code: string; pattern: RegExp }> = [
  { code: "WEAPON_FIREARM", pattern: /\b(arma(s)? de fogo|revolver(es)?|pistola(s)?|fuzil(is)?|rifle(s)?|carabina(s)?|espingarda(s)?|escopeta(s)?|metralhadora(s)?|submetralhadora(s)?|mosquetao|bacamarte|garrucha(s)?|glock|arma artesanal|arma caseira|calibre\s*\.?\s*\d+)\b/ },
  { code: "WEAPON_AIR_REPLICA", pattern: /\b(arma(s)? de pressao|carabina(s)? de pressao|espingarda(s)? de pressao|espingarda(s)? de chumbo|airsoft|airgun|bb gun|arma(s)? de chumbinho|marcador(es)? de paintball|replica(s)? de arma)\b/ },
  { code: "WEAPON_COMPONENT", pattern: /\b(silenciador(es)? de arma|supressor(es)? de arma|cano(s)? de arma|carregador(es)? de (pistola|fuzil|rifle|carabina)|mira(s)? para (pistola|fuzil|rifle|carabina)|gatilho(s)? de arma)\b/ },
  { code: "OTHER_WEAPON", pattern: /\b(soco ingles|taser|arma de choque|spray de pimenta|faca tatica|faca de combate|canivete automatico|besta de caca)\b/ },
  { code: "AMMUNITION", pattern: /\b(municao|municoes|cartucho(s)? de municao|cartucho(s)? calibre|bala(s)? calibre|projetil(eis)? de arma|espoleta(s)?|polvora|chumbinho(s)? para (arma|carabina|espingarda))\b/ },
  { code: "EXPLOSIVE", pattern: /\b(explosivo(s)?|dinamite|granada(s)?|bomba caseira|artefato explosivo|coquetel molotov|detonador(es)?)\b/ },
  { code: "MEDICINE", pattern: /\b(remedio(s)?|medicamento(s)?|farmaco(s)?|antibiotico(s)?|antidepressivo(s)?|ansiolitico(s)?|tarja preta|insulina|semaglutida|tirzepatida|mounjaro|ozempic|wegovy|sibutramina|anabolizante(s)?|esteroide(s)?|hormonio(s)?|rivotril|clonazepam|diazepam|zolpidem|venvanse|ritalina|codeina|tramadol|amoxicilina|azitromicina|dipirona|paracetamol|ibuprofeno|receita medica falsa)\b/ },
  { code: "ILLEGAL_DRUG", pattern: /\b(cocaina|crack|maconha|haxixe|heroina|metanfetamina|lsd|ecstasy|mdma|droga(s)? ilicita(s)?|entorpecente(s)?|narcotico(s)?)\b/ },
  { code: "ACCOUNT_RESALE", pattern: /\b(conta netflix|conta spotify|conta instagram|conta tiktok|iptv)\b/ },
  { code: "FRAUD_TOOL", pattern: /\b(hack|cheat|cartao clonado|clonagem de cartao|dados pessoais|documento(s)? falso(s)?|rg falso|cpf falso|cnh falsa|passaporte falso|diploma falso|atestado falso|nota(s)? falsa(s)?|dinheiro falso|maquininha adulterada|chupa cabra|phishing|painel de fraude)\b/ },
  { code: "ADULT_CONTENT", pattern: /\b(pornografia|pornografico(s)?|conteudo adulto|conteudo sexual|sexo explicito|video(s)? de sexo|foto(s)? de sexo|nude(s|z)?|onlyfans|acompanhante sexual|programa sexual|servico(s)? sexual(is)?|massagem erotica)\b/ },
  { code: "CHILD_SEXUAL_ABUSE", pattern: /\b(pedofilia|pedofilo(s)?|conteudo pedofilo|pornografia infantil|conteudo sexual infantil|sexo com menor|nude(s|z)? de menor|foto(s)? intima(s)? de menor|video(s)? intimo(s)? de menor|exploracao sexual infantil|abuso sexual infantil|material sexual de crianca|material sexual de adolescente)\b/ },
  { code: "STOLEN_GOODS", pattern: /\b(produto(s)? roubado(s)?|produto(s)? furtado(s)?|sem procedencia|carga roubada|mercadoria roubada|objeto furtado|receptacao|desmanche ilegal|peca(s)? de veiculo roubado)\b/ },
  { code: "CRIMINAL_SERVICE", pattern: /\b(servico de agiotagem|agiota|lavagem de dinheiro|laranja para conta|conta bancaria de terceiro|invasao de conta|clonar whatsapp|desbloqueio ilegal|fraude bancaria)\b/ }
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
  const text = stripAllowedContexts(normalize([
    input.title,
    input.description,
    input.category,
    input.subcategory,
    input.brand,
    input.model
  ].filter(Boolean).join(" ")));

  const blocked = blockedPolicySignals.filter((signal) => signal.pattern.test(text)).map((signal) => signal.code);
  if (blocked.length) {
    return { status: "BLOCKED", riskScore: 90, reasons: blocked.slice(0, 5) };
  }

  const review = reviewPolicyTerms.filter((term) => text.includes(normalize(term)));
  const userRisk = Number(input.userRiskScore ?? 0);
  if (review.length || userRisk >= 105) {
    return { status: "NEEDS_REVIEW", riskScore: Math.max(45, Math.min(85, review.length * 18 + Math.floor(userRisk / 3))), reasons: review.slice(0, 5) };
  }

  return { status: "APPROVED", riskScore: 10, reasons: [] };
}

function stripAllowedContexts(value: string) {
  return allowedContextTerms.reduce((text, term) => text.replaceAll(normalize(term), " "), value).replace(/\s+/g, " ").trim();
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
