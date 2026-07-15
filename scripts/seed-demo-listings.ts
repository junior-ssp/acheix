#!/usr/bin/env tsx
import { hashPassword } from "@/lib/auth";
import { addDays } from "@/lib/expiration-policy";
import { buildSearchText, slugify } from "@/lib/listings";
import { realEstateSeedKey, seedListingOwnerEmail, seedListingMarker, seedSearchText, vehicleSeedKey, normalizeSeedText } from "@/lib/seed-listing-replacement";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

type SeedListing = {
  title: string;
  description: string;
  category: "VEHICLE" | "REAL_ESTATE";
  type: string;
  priceCents: number;
  city: string;
  district: string;
  photos: string[];
  vehicle?: {
    brand: string;
    model: string;
    version: string;
    year: number;
    mileageKm: number;
    color: string;
    fuel: string;
    gearbox: string;
  };
  realEstate?: {
    purpose: "Venda" | "Locação";
    bedrooms: number;
    suites: number;
    bathrooms: number;
    parking: number;
    areaM2: number;
    features: string[];
  };
};

const vehiclePhotoPool = [
  "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=82"
];

const motorcyclePhotoPool = [
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1552306062-29a5560e1c31?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1508357941501-0924cf312bbd?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1524591652733-73fa1ae7b5ee?auto=format&fit=crop&w=1200&q=82"
];

const apartmentPhotoPool = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=82"
];

const housePhotoPool = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1592595896616-c37162298647?auto=format&fit=crop&w=1200&q=82"
];

function photoSet(pool: string[], lock: number) {
  return Array.from({ length: 5 }, (_, index) => pool[(lock + index) % pool.length]);
}

const seedNotice = "Atendimento somente pelo chat interno do Achei X.";

const seeds: SeedListing[] = [
  ...[
    ["Honda", "CG 160 Fan", "160cc flex partida elétrica", 2022, 13900, "São Paulo", "Tatuapé"],
    ["Honda", "Biz 125", "EX completa e econômica", 2021, 11900, "Guarulhos", "Centro"],
    ["Honda", "PCX 160", "CBS scooter econômica", 2022, 16900, "Santos", "Ponta da Praia"],
    ["Honda", "NXR 160 Bros", "ESDD pronta para uso urbano", 2020, 15500, "Campinas", "Cambuí"],
    ["Honda", "CB 300F Twister", "ABS baixa quilometragem", 2023, 23500, "Sorocaba", "Campolim"],
    ["Yamaha", "Fazer FZ25", "250 ABS revisada", 2021, 19900, "São Bernardo do Campo", "Rudge Ramos"],
    ["Yamaha", "Lander 250", "ABS uso misto", 2020, 20900, "Praia Grande", "Boqueirão"],
    ["Yamaha", "Factor 150", "UBS econômica", 2022, 12500, "Osasco", "Jaguaribe"],
    ["Yamaha", "MT-03", "321cc ABS esportiva", 2019, 26500, "Santo André", "Jardim"],
    ["Yamaha", "NMAX 160", "ABS scooter urbana", 2021, 16500, "Ribeirão Preto", "Jardim Botânico"]
  ].map(([brand, model, version, year, price, city, district], index) => vehicleSeed({
    type: "Moto",
    brand: String(brand),
    model: String(model),
    version: String(version),
    year: Number(year),
    priceCents: Number(price) * 100,
    city: String(city),
    district: String(district),
    photos: photoSet(motorcyclePhotoPool, index)
  })),
  ...[
    ["Ford", "Ka", "SE 1.0 flex completo", 2018, 32900, "São Paulo", "Vila Mariana"],
    ["Ford", "Fiesta", "SE 1.6 hatch completo", 2016, 34900, "Guarulhos", "Vila Galvão"],
    ["Ford", "EcoSport", "Freestyle 1.6 manual", 2017, 49900, "Campinas", "Taquaral"],
    ["Ford", "Focus", "SE 1.6 flex", 2015, 42900, "Ribeirão Preto", "Bonfim Paulista"],
    ["Ford", "Ka Sedan", "SE Plus 1.5 flex", 2019, 45900, "Santos", "Embaré"],
    ["Fiat", "Argo", "Drive 1.0 flex completo", 2020, 52900, "São Paulo", "Mooca"],
    ["Fiat", "Mobi", "Like 1.0 flex econômico", 2021, 42900, "Osasco", "Centro"],
    ["Fiat", "Uno", "Attractive 1.0 flex", 2019, 37900, "Sorocaba", "Além Ponte"],
    ["Fiat", "Siena", "EL 1.4 flex", 2016, 32900, "Santo André", "Campestre"],
    ["Fiat", "Cronos", "Drive 1.3 flex completo", 2021, 59900, "Praia Grande", "Canto do Forte"],
    ["Volkswagen", "Gol", "1.0 flex completo", 2019, 43900, "São Paulo", "Santana"],
    ["Volkswagen", "Polo", "MSI 1.6 flex", 2019, 58900, "São Bernardo do Campo", "Centro"],
    ["Volkswagen", "Fox", "Connect 1.6 flex", 2018, 45900, "Campinas", "Barão Geraldo"],
    ["Volkswagen", "Saveiro", "Trendline cabine simples", 2017, 52900, "Guarujá", "Pitangueiras"],
    ["Volkswagen", "Voyage", "1.6 flex completo", 2020, 54900, "Jundiaí", "Anhangabaú"]
  ].map(([brand, model, version, year, price, city, district], index) => vehicleSeed({
    type: "Carro",
    brand: String(brand),
    model: String(model),
    version: String(version),
    year: Number(year),
    priceCents: Number(price) * 100,
    city: String(city),
    district: String(district),
    photos: photoSet(vehiclePhotoPool, index)
  })),
  ...[
    ["Apto", "Venda", "Apartamento 2 quartos em São Paulo", 285000, "São Paulo", "Vila Prudente", 2, 0, 1, 1, 55],
    ["Apto", "Locação", "Apartamento compacto perto do metrô", 1800, "São Paulo", "Tucuruvi", 1, 0, 1, 0, 38],
    ["Apto", "Venda", "Apartamento reformado em Guarulhos", 245000, "Guarulhos", "Jardim Maia", 2, 0, 1, 1, 52],
    ["Apto", "Locação", "Apartamento simples próximo ao centro", 1600, "Osasco", "Presidente Altino", 2, 0, 1, 1, 48],
    ["Apto", "Venda", "Apartamento com lazer em Campinas", 320000, "Campinas", "Cambuí", 2, 1, 2, 1, 66],
    ["Apto", "Locação", "Apartamento perto da praia", 2200, "Santos", "Gonzaga", 2, 0, 1, 1, 58],
    ["Apto", "Venda", "Apartamento familiar no ABC", 300000, "São Bernardo do Campo", "Baeta Neves", 2, 0, 1, 1, 60],
    ["Apto", "Locação", "Apartamento bem localizado em Santo André", 1700, "Santo André", "Centro", 1, 0, 1, 1, 42],
    ["Apto", "Venda", "Apartamento de 3 dormitórios em Sorocaba", 350000, "Sorocaba", "Campolim", 3, 1, 2, 1, 78],
    ["Apto", "Locação", "Apartamento próximo à orla", 1900, "Praia Grande", "Canto do Forte", 2, 0, 1, 1, 55]
  ].map(([type, purpose, title, price, city, district, bedrooms, suites, bathrooms, parking, areaM2], index) => realEstateSeed({
    type: String(type),
    purpose: purpose as "Venda" | "Locação",
    title: String(title),
    priceCents: Number(price) * 100,
    city: String(city),
    district: String(district),
    bedrooms: Number(bedrooms),
    suites: Number(suites),
    bathrooms: Number(bathrooms),
    parking: Number(parking),
    areaM2: Number(areaM2),
    photos: photoSet(apartmentPhotoPool, index)
  })),
  ...[
    ["Casa", "Venda", "Casa térrea com quintal", 390000, "São Paulo", "Interlagos", 2, 0, 1, 2, 95],
    ["Casa", "Locação", "Casa próxima a comércios", 2400, "São Paulo", "Vila Formosa", 2, 0, 1, 1, 80],
    ["Casa", "Venda", "Casa familiar em Guarulhos", 360000, "Guarulhos", "Vila Rosália", 3, 0, 2, 2, 110],
    ["Casa", "Locação", "Sobrado em rua tranquila", 2800, "Osasco", "Bela Vista", 2, 0, 2, 1, 90],
    ["Casa", "Venda", "Casa espaçosa em Campinas", 430000, "Campinas", "Taquaral", 3, 1, 2, 2, 130],
    ["Casa", "Locação", "Casa próxima à praia para morar", 2600, "Santos", "Marapé", 2, 0, 1, 1, 75],
    ["Casa", "Venda", "Sobrado com garagem no ABC", 410000, "São Bernardo do Campo", "Assunção", 3, 0, 2, 2, 120],
    ["Casa", "Locação", "Casa térrea com edícula", 2300, "Santo André", "Vila Alpina", 2, 0, 1, 2, 85],
    ["Casa", "Venda", "Casa em bairro tranquilo", 380000, "Sorocaba", "Jardim Europa", 3, 1, 2, 2, 125],
    ["Casa", "Locação", "Casa ampla no litoral", 2500, "Praia Grande", "Boqueirão", 2, 0, 1, 1, 90]
  ].map(([type, purpose, title, price, city, district, bedrooms, suites, bathrooms, parking, areaM2], index) => realEstateSeed({
    type: String(type),
    purpose: purpose as "Venda" | "Locação",
    title: String(title),
    priceCents: Number(price) * 100,
    city: String(city),
    district: String(district),
    bedrooms: Number(bedrooms),
    suites: Number(suites),
    bathrooms: Number(bathrooms),
    parking: Number(parking),
    areaM2: Number(areaM2),
    photos: photoSet(housePhotoPool, index)
  }))
];

async function main() {
  if (process.env.ALLOW_UNCURATED_SEED_LISTINGS !== "SIM") {
    throw new Error("Seed listings bloqueados: use apenas anúncios com fotos curadas e coerentes com o título.");
  }

  const owner = await ensureSeedOwner();
  const plan = await ensureSeedPlan();
  const now = new Date();
  const expiresAt = addDays(now, 365);

  let created = 0;
  let updated = 0;
  const expectedSlugs = new Set<string>();

  for (const seed of seeds) {
    expectedSlugs.add(seedSlug(seed));
    const result = await upsertSeedListing(seed, owner.id, plan.id, now, expiresAt);
    if (result === "created") created += 1;
    else updated += 1;
  }

  const obsolete = await expireObsoleteSeeds(owner.id, expectedSlugs);

  await db().from("AuditLog").insert({
    id: newDbId(),
    userId: owner.id,
    action: "seed_listing.batch_upserted",
    metadata: { total: seeds.length, created, updated, obsoleteExpired: obsolete, marker: seedListingMarker, at: new Date().toISOString() }
  });

  console.log(`Seeds concluídos: ${created} criados, ${updated} atualizados, ${obsolete} antigos expirados, total esperado ${seeds.length}.`);
}

function vehicleSeed(input: {
  type: "Moto" | "Carro";
  brand: string;
  model: string;
  version: string;
  year: number;
  priceCents: number;
  city: string;
  district: string;
  photos: string[];
}): SeedListing {
  const visibleTitle = vehiclePublicTitle(input.type, input.version, input.year);
  const visibleDescription = `${visibleTitle}, revisado e pronto para uso. ${seedNotice}`;
  return {
    title: visibleTitle,
    description: visibleDescription,
    category: "VEHICLE",
    type: input.type,
    priceCents: input.priceCents,
    city: input.city,
    district: input.district,
    photos: input.photos,
    vehicle: {
      brand: input.brand,
      model: input.model,
      version: input.version,
      year: input.year,
      mileageKm: input.year >= 2024 ? 3500 : input.year >= 2023 ? 9800 : 24500,
      color: input.type === "Moto" ? (input.brand === "Honda" ? "Vermelha" : "Azul") : "Prata",
      fuel: "Flex",
      gearbox: input.type === "Moto" ? "Manual" : "Automático"
    }
  };
}

function vehiclePublicTitle(type: "Moto" | "Carro", version: string, year: number) {
  const text = version.toLowerCase();
  if (type === "Moto") {
    if (text.includes("scooter")) return `Moto scooter revisada ${year}`;
    if (text.includes("321")) return `Moto urbana revisada ${year}`;
    if (text.includes("250")) return `Moto urbana revisada ${year}`;
    if (text.includes("160")) return `Moto urbana revisada ${year}`;
    if (text.includes("150")) return `Moto 150cc econômica ${year}`;
    if (text.includes("125")) return `Moto 125cc econômica ${year}`;
    return `Moto urbana revisada ${year}`;
  }

  return `Carro usado completo ${year}`;

  if (text.includes("cabine") || text.includes("picape") || text.includes("saveiro")) return `Carro usado completo ${year}`;
  if (text.includes("sedan")) return `Sedã flex completo ${year}`;
  if (text.includes("freestyle") || text.includes("ecosport")) return `Carro usado completo ${year}`;
  if (text.includes("hatch")) return `Carro usado completo ${year}`;
  if (text.includes("1.0")) return `Carro usado completo ${year}`;
  if (text.includes("1.6")) return `Carro usado completo ${year}`;
  if (text.includes("1.5")) return `Carro usado completo ${year}`;
  if (text.includes("1.4")) return `Carro econômico flex ${year}`;
  if (text.includes("1.3")) return `Sedã compacto flex ${year}`;
  return `Carro completo flex ${year}`;
}

function realEstateSeed(input: {
  type: string;
  purpose: "Venda" | "Locação";
  title: string;
  priceCents: number;
  city: string;
  district: string;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parking: number;
  areaM2: number;
  photos: string[];
}): SeedListing {
  return {
    title: input.title,
    description: `${input.title}. ${seedNotice}`,
    category: "REAL_ESTATE",
    type: input.type,
    priceCents: input.priceCents,
    city: input.city,
    district: input.district,
    photos: input.photos,
    realEstate: {
      purpose: input.purpose,
      bedrooms: input.bedrooms,
      suites: input.suites,
      bathrooms: input.bathrooms,
      parking: input.parking,
      areaM2: input.areaM2,
      features: ["Chat interno", "Localização aproximada", "Base inicial Achei X"]
    }
  };
}

async function ensureSeedOwner() {
  const existing = await db().from("User").select("id,email").eq("email", seedListingOwnerEmail).maybeSingle();
  throwDbError(existing.error);
  if (existing.data) return existing.data as { id: string; email: string };

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("User")
    .insert({
      id: newDbId(),
      name: "Curadoria Achei X",
      accountType: "CNPJ",
      cpf: null,
      cnpj: null,
      birthDate: null,
      email: seedListingOwnerEmail,
      emailVerifiedAt: now,
      passwordHash: await hashPassword(`seed-${Date.now()}-${Math.random()}`),
      phone: null,
      whatsapp: null,
      cep: null,
      address: null,
      number: null,
      complement: null,
      district: null,
      city: "São Paulo",
      state: "SP",
      notificationChannel: "IN_APP",
      notificationChannels: ["IN_APP"],
      allowPublicPhone: false,
      allowPublicWhatsapp: false,
      allowPublicEmail: false,
      acceptedTermsAt: now,
      identityVerifiedAt: now,
      updatedAt: now
    })
    .select("id,email")
    .single();
  throwDbError(error);
  return data as { id: string; email: string };
}

async function ensureSeedPlan() {
  const { data, error } = await db()
    .from("Plan")
    .select("id,code")
    .eq("code", "FREE")
    .maybeSingle();
  throwDbError(error);
  if (!data) throw new Error("Plano FREE não encontrado.");
  return data as { id: string; code: string };
}

async function upsertSeedListing(seed: SeedListing, ownerId: string, planId: string, now: Date, expiresAt: Date) {
  const slug = seedSlug(seed);
  const seedKey = seed.vehicle
    ? vehicleSeedKey(seed.vehicle)
    : realEstateSeedKey({ type: seed.type, purpose: seed.realEstate?.purpose, city: seed.city });
  const seedGroup = seed.vehicle
    ? `vehicle:${normalizeSeedText(seed.type)}:${normalizeSeedText(seed.vehicle.brand)}`
    : `real-estate:${normalizeSeedText(seed.type)}:${normalizeSeedText(seed.realEstate?.purpose)}`;
  const searchText = seedSearchText([
    seed.title,
    seed.description,
    seed.type,
    seed.city,
    "SP",
    seed.district,
    seed.vehicle && [seed.vehicle.brand, seed.vehicle.model, seed.vehicle.version, String(seed.vehicle.year), seed.vehicle.color, seed.vehicle.fuel, seed.vehicle.gearbox],
    seed.realEstate && [seed.realEstate.purpose, String(seed.realEstate.bedrooms), String(seed.realEstate.bathrooms), String(seed.realEstate.parking), String(seed.realEstate.areaM2), seed.realEstate.features.join(" ")]
  ], seedKey, seedGroup);

  const existing = await db().from("Listing").select("id,ownerId").eq("slug", slug).maybeSingle();
  throwDbError(existing.error);

  let listingId = existing.data?.id as string | undefined;
  let result: "created" | "updated" = "updated";

  const listingPayload = {
    slug,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    type: seed.type,
    priceCents: seed.priceCents,
    city: seed.city,
    state: "SP",
    district: seed.district,
    status: "ACTIVE",
    showPhone: false,
    showWhatsapp: false,
    showEmail: false,
    retainChatAudit: true,
    searchText,
    expiresAt: expiresAt.toISOString(),
    termsAcceptedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ownerId,
    planId
  };

  if (listingId) {
    if (existing.data?.ownerId !== ownerId) throw new Error(`Slug ${slug} pertence a outro usuário; abortando para não sobrescrever anúncio real.`);
    const { error } = await db().from("Listing").update(listingPayload).eq("id", listingId);
    throwDbError(error);
  } else {
    listingId = newDbId();
    const { error } = await db().from("Listing").insert({ id: listingId, ...listingPayload });
    throwDbError(error);
    result = "created";
  }

  await resetSeedChildren(listingId);

  const { error: photoError } = await db().from("Photo").insert(
    seed.photos.slice(0, 5).map((url, order) => ({ id: newDbId(), listingId, url, alt: `${seed.title} - foto ${order + 1}`, order }))
  );
  throwDbError(photoError);

  if (seed.vehicle) {
    const { error } = await db().from("Vehicle").insert({ id: newDbId(), listingId, ...seed.vehicle });
    throwDbError(error);
  }

  if (seed.realEstate) {
    const { error } = await db().from("RealEstate").insert({ id: newDbId(), listingId, ...seed.realEstate });
    throwDbError(error);
  }

  const { error: subscriptionError } = await db().from("Subscription").insert({
    id: newDbId(),
    listingId,
    planId,
    startsAt: now.toISOString(),
    endsAt: expiresAt.toISOString()
  });
  throwDbError(subscriptionError);

  return result;
}

function seedSlug(seed: SeedListing) {
  return `seed-${slugify([seed.category, seed.title, seed.city, seed.district].join(" "))}`;
}

async function expireObsoleteSeeds(ownerId: string, expectedSlugs: Set<string>) {
  const { data, error } = await db()
    .from("Listing")
    .select("id,slug,status,searchText")
    .eq("ownerId", ownerId)
    .eq("status", "ACTIVE");
  throwDbError(error);

  const obsolete = (data ?? []).filter((listing) => {
    const text = String((listing as any).searchText ?? "");
    return text.includes(seedListingMarker) && !expectedSlugs.has(String((listing as any).slug));
  });
  if (!obsolete.length) return 0;

  const now = new Date().toISOString();
  const { error: updateError } = await db()
    .from("Listing")
    .update({ status: "EXPIRED", expiresAt: now, updatedAt: now })
    .in("id", obsolete.map((listing: any) => listing.id));
  throwDbError(updateError);
  return obsolete.length;
}

async function resetSeedChildren(listingId: string) {
  for (const table of ["Photo", "Vehicle", "RealEstate", "Subscription"]) {
    const { error } = await db().from(table).delete().eq("listingId", listingId);
    throwDbError(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
