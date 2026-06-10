export const categories = {
  VEHICLE: ["Carro", "Moto", "Bicicleta Elétrica", "Bicicleta de Pedal", "Caminhão", "Utilitário", "Van", "Ônibus", "Embarcação"],
  REAL_ESTATE: [
    "Casa",
    "Apto",
    "Terreno",
    "Chácara",
    "Fazenda",
    "Sala Comercial",
    "Galpão",
    "Kitnet"
  ]
} as const;

export const planCatalog = [
  { code: "FREE", name: "GRÁTIS", priceCents: 0, originalPriceCents: null, durationDays: 30, photoLimit: 3, listingLimit: 1, benefits: ["Publicação por 30 dias", "1 anúncio"] },
  { code: "BRONZE", name: "BRONZE", priceCents: 990, originalPriceCents: null, durationDays: 60, photoLimit: 5, listingLimit: 1, benefits: ["Publicação por 60 dias", "Até 5 fotos", "1 anúncio"] },
  { code: "SILVER", name: "PRATA", priceCents: 1990, originalPriceCents: null, durationDays: 90, photoLimit: 7, listingLimit: 1, benefits: ["Publicação por 90 dias", "Até 7 fotos", "1 anúncio"] },
  { code: "GOLD", name: "OURO", priceCents: 2990, originalPriceCents: null, durationDays: 120, photoLimit: 10, listingLimit: 1, benefits: ["Publicação por 120 dias", "Até 10 fotos", "1 anúncio"] },
  {
    code: "X6",
    name: "X6 PROFISSIONAL",
    priceCents: 29900,
    originalPriceCents: 39900,
    durationDays: 180,
    photoLimit: 10,
    listingLimit: 10,
    benefits: [
      "Até 10 anúncios ativos simultaneamente",
      "Exclusivo para conta com CNPJ",
      "Veículos ou Imóveis",
      "Validade de 6 meses",
      "Edição ilimitada dos anúncios",
      "Alteração de fotos",
      "Alteração de preços",
      "Alteração de descrição",
      "Alteração de informações do anúncio",
      "Ideal para lojas de veículos, corretores, proprietários e pequenas imobiliárias"
    ]
  },
  {
    code: "X12",
    name: "X12 PROFISSIONAL",
    priceCents: 59900,
    originalPriceCents: 79900,
    durationDays: 365,
    photoLimit: 10,
    listingLimit: 20,
    benefits: [
      "Até 20 anúncios ativos simultaneamente",
      "Exclusivo para conta com CNPJ",
      "Veículos ou Imóveis",
      "Validade de 12 meses",
      "Edição ilimitada dos anúncios",
      "Alteração de fotos",
      "Alteração de preços",
      "Alteração de descrição",
      "Alteração de informações do anúncio",
      "Ideal para revendas, imobiliárias, corretores com grande carteira e empresas do setor imobiliário"
    ]
  }
] as const;

export const shareChannels = ["whatsapp", "copy", "social"] as const;

export const brazilStates = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" }
] as const;

export const citiesByState: Record<string, string[]> = {
  AC: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Tarauacá", "Feijó"],
  AL: ["Maceió", "Arapiraca", "Palmeira dos Índios", "Rio Largo", "Penedo"],
  AP: ["Macapá", "Santana", "Laranjal do Jari", "Oiapoque", "Mazagão"],
  AM: ["Manaus", "Parintins", "Itacoatiara", "Manacapuru", "Coari"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna"],
  CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral"],
  DF: ["Brasília", "Taguatinga", "Ceilândia", "Gama", "Sobradinho"],
  ES: ["Vitória", "Vila Velha", "Serra", "Cariacica", "Linhares"],
  GO: ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde", "Luziânia"],
  MA: ["São Luís", "Imperatriz", "Timon", "Caxias", "Bacabal"],
  MT: ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Tangará da Serra"],
  MS: ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá", "Ponta Porã"],
  MG: ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim"],
  PA: ["Belém", "Ananindeua", "Santarém", "Marabá", "Parauapebas"],
  PB: ["João Pessoa", "Campina Grande", "Santa Rita", "Patos", "Bayeux"],
  PR: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel"],
  PE: ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina"],
  PI: ["Teresina", "Parnaíba", "Picos", "Piripiri", "Floriano"],
  RJ: ["Rio de Janeiro", "Niterói", "São Gonçalo", "Duque de Caxias", "Petrópolis"],
  RN: ["Natal", "Mossoró", "Parnamirim", "Caicó", "Macaíba"],
  RS: ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria"],
  RO: ["Porto Velho", "Ji-Paraná", "Ariquemes", "Vilhena", "Cacoal"],
  RR: ["Boa Vista", "Rorainópolis", "Caracaraí", "Alto Alegre", "Mucajaí"],
  SC: ["Florianópolis", "Joinville", "Blumenau", "São José", "Chapecó"],
  SP: ["São Paulo", "Campinas", "Santos", "Guarulhos", "Ribeirão Preto"],
  SE: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto", "Itabaiana", "São Cristóvão"],
  TO: ["Palmas", "Araguaína", "Gurupi", "Porto Nacional", "Paraíso do Tocantins"]
};

const demoCreatedAt = new Date(Date.now() - 12 * 86400000);

function demoExpiresIn(durationDays: number) {
  return new Date(demoCreatedAt.getTime() + durationDays * 86400000);
}

export const demoListings = [
  {
    id: "demo-vehicle-free",
    slug: "demo-renault-kwid-zen-2020",
    title: "Renault Kwid Zen 2020 econômico",
    category: "VEHICLE",
    type: "Carro",
    priceCents: 4190000,
    city: "Campinas",
    state: "SP",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(30),
    photos: [{ url: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80", alt: "Carro compacto em anúncio demonstrativo" }],
    plan: { code: "FREE", name: "GRÁTIS" }
  },
  {
    id: "demo-vehicle-1",
    slug: "demo-honda-civic-touring-2022",
    title: "Honda Civic Touring 2022 completo",
    category: "VEHICLE",
    type: "Carro",
    priceCents: 14890000,
    city: "Sao Paulo",
    state: "SP",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(120),
    photos: [{ url: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80", alt: "Honda Civic prata em anúncio demonstrativo" }],
    plan: { code: "GOLD", name: "OURO" }
  },
  {
    id: "demo-vehicle-2",
    slug: "demo-yamaha-mt-03-2024",
    title: "Yamaha MT-03 2024 baixa quilometragem",
    category: "VEHICLE",
    type: "Moto",
    priceCents: 2890000,
    city: "Curitiba",
    state: "PR",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(90),
    photos: [{ url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80", alt: "Moto esportiva em anúncio demonstrativo" }],
    plan: { code: "SILVER", name: "PRATA" }
  },
  {
    id: "demo-vehicle-3",
    slug: "demo-fiat-toro-volcano-2021",
    title: "Fiat Toro Volcano diesel 2021",
    category: "VEHICLE",
    type: "Utilitário",
    priceCents: 12650000,
    city: "Goiania",
    state: "GO",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(60),
    photos: [{ url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80", alt: "Picape em anúncio demonstrativo" }],
    plan: { code: "BRONZE", name: "BRONZE" }
  },
  {
    id: "demo-vehicle-electric-byd",
    slug: "demo-byd-dolphin-mini-eletrico-2025",
    title: "BYD Dolphin Mini elétrico 2025 completo",
    category: "VEHICLE",
    type: "Carro",
    priceCents: 11890000,
    city: "São Paulo",
    state: "SP",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(120),
    photos: [{ url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=80", alt: "Carro elétrico em anúncio demonstrativo" }],
    plan: { code: "GOLD", name: "OURO" }
  },
  {
    id: "demo-vehicle-hybrid-honda",
    slug: "demo-honda-civic-hibrido-2024",
    title: "Honda Civic híbrido 2024 completo",
    category: "VEHICLE",
    type: "Carro",
    priceCents: 18990000,
    city: "Campinas",
    state: "SP",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(120),
    photos: [{ url: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80", alt: "Honda híbrido em anúncio demonstrativo" }],
    plan: { code: "GOLD", name: "OURO" }
  },
  {
    id: "demo-vehicle-electric-moto-voltz",
    slug: "demo-voltz-evs-eletrica-2024",
    title: "Voltz EVS elétrica 2024 bateria revisada",
    category: "VEHICLE",
    type: "Moto",
    priceCents: 1890000,
    city: "Recife",
    state: "PE",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(90),
    photos: [{ url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80", alt: "Moto elétrica em anúncio demonstrativo" }],
    plan: { code: "SILVER", name: "PRATA" }
  },
  {
    id: "demo-vehicle-electric-bike",
    slug: "demo-lev-e-bike-urbana-eletrica",
    title: "Lev E-bike urbana elétrica dobrável",
    category: "VEHICLE",
    type: "Bicicleta Elétrica",
    priceCents: 690000,
    city: "Santos",
    state: "SP",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(60),
    photos: [{ url: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=80", alt: "Bicicleta elétrica em anúncio demonstrativo" }],
    plan: { code: "BRONZE", name: "BRONZE" }
  },
  {
    id: "demo-vehicle-pedal-bike",
    slug: "demo-caloi-explorer-bike-pedal",
    title: "Caloi Explorer bike de pedal aro 29",
    category: "VEHICLE",
    type: "Bicicleta de Pedal",
    priceCents: 180000,
    city: "Campinas",
    state: "SP",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(30),
    photos: [{ url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80", alt: "Bicicleta de pedal em anúncio demonstrativo" }],
    plan: { code: "FREE", name: "GRÁTIS" }
  },
  {
    id: "demo-real-estate-free",
    slug: "demo-kitnet-mobiliada-centro",
    title: "Kitnet mobiliada no centro",
    category: "REAL_ESTATE",
    type: "Kitnet",
    priceCents: 120000,
    city: "Santos",
    state: "SP",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(30),
    photos: [{ url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", alt: "Kitnet mobiliada em anúncio demonstrativo" }],
    plan: { code: "FREE", name: "GRÁTIS" }
  },
  {
    id: "demo-real-estate-1",
    slug: "demo-apartamento-vista-livre",
    title: "Apartamento com varanda e vista livre",
    category: "REAL_ESTATE",
    type: "Apto",
    priceCents: 73500000,
    city: "Belo Horizonte",
    state: "MG",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(120),
    photos: [{ url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80", alt: "Apartamento mobiliado em anúncio demonstrativo" }],
    plan: { code: "GOLD", name: "OURO" }
  },
  {
    id: "demo-real-estate-2",
    slug: "demo-casa-condominio-3-quartos",
    title: "Casa em condominio com 3 quartos",
    category: "REAL_ESTATE",
    type: "Casa",
    priceCents: 98000000,
    city: "Florianopolis",
    state: "SC",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(90),
    photos: [{ url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80", alt: "Casa moderna em anúncio demonstrativo" }],
    plan: { code: "SILVER", name: "PRATA" }
  },
  {
    id: "demo-real-estate-3",
    slug: "demo-sala-comercial-centro",
    title: "Sala comercial no centro pronta para uso",
    category: "REAL_ESTATE",
    type: "Sala Comercial",
    priceCents: 320000,
    city: "Recife",
    state: "PE",
    createdAt: demoCreatedAt,
    expiresAt: demoExpiresIn(60),
    photos: [{ url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80", alt: "Sala comercial em anúncio demonstrativo" }],
    plan: { code: "BRONZE", name: "BRONZE" }
  }
] as const;

