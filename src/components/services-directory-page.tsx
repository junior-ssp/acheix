import { BadgeCheck, Clock3, MapPin, ShieldCheck, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { geocodeFreeformBrazilAddress, lookupCepWithCoordinates, parseRadiusKm } from "@/lib/geolocation";
import { audienceForService, defaultServiceCategories, isServiceAudience, normalizeServiceSlug } from "@/lib/service-catalog";
import { isServiceVisibleByBilling, serviceBillingFromComplement } from "@/lib/service-billing-policy";
import { isPaidServicePlanCode } from "@/lib/service-plans";
import { isServicePublicContactEnabled } from "@/lib/service-contact-disclosure";
import { publicServiceAreas, publicServiceAreaText } from "@/lib/service-public-location";
import { orderAndRecordServiceSearchExposure } from "@/lib/service-search-exposure";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ServiceContactButton } from "@/components/service-contact-button";
import { ManualListingCard } from "@/components/manual-listing-card";
import { ServiceResultReel } from "@/components/service-result-reel";
import { ServiceSearchForm } from "@/components/service-search-form";
import { ServiceSearchShortcuts } from "@/components/service-search-shortcuts";
import { SearchResultModal } from "@/components/search-result-modal";
import { PublicShareButton } from "@/components/public-share-button";
import { ServiceCategoryIcon, serviceCategoryIconComponent } from "@/components/service-category-icon";
import { WantedRequestSection } from "@/components/wanted-request-section";
import { findActiveWantedRequestsByContext } from "@/lib/wanted-requests";
import { findActiveManualListings } from "@/lib/manual-listings";
import type { Route } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

const serviceSearchLimit = 80;
type ServicesDirectoryMode = "companies" | "services";

type ServicesPageParams = {
  q?: string;
  category?: string;
  state?: string;
  city?: string;
  district?: string;
  cep?: string;
  address?: string;
  audience?: string;
  radiusKm?: string;
  searched?: string;
};

type PublicService = {
  id: string;
  type: string;
  title: string;
  companyName: string | null;
  providerName: string | null;
  category: string;
  categories: string[];
  description: string;
  experience: string | null;
  businessHours: string | null;
  city: string;
  state: string;
  serviceAreas: string[];
  imageUrl: string | null;
  averageRating: number;
  totalRatings: number;
  totalServices: number;
  responseMinutes: number | null;
  verified: boolean;
  rank: string;
  score: number;
  distanceKm: number | null;
  contactPublicEnabled: boolean;
  isPro: boolean;
  complemento?: string | null;
};

type SearchRow = {
  id: string;
  tipo_cadastro: string;
  categoria_servico: string;
  categorias_servico: string[];
  name: string | null;
  nome_fantasia: string | null;
  descricao: string;
  experiencia: string | null;
  horario_atendimento: string | null;
  cidade: string;
  bairro: string | null;
  cep: string | null;
  estado: string;
  foto_perfil: string | null;
  logo_empresa: string | null;
  avaliacao_media: number;
  total_avaliacoes: number;
  total_servicos: number;
  tempo_resposta_minutos: number | null;
  conta_verificada: boolean;
  rank: string;
  score: number;
  distance_km: number | null;
  complemento?: string | null;
};



export async function ServicesDirectoryPage({ searchParams, mode }: { searchParams: ServicesPageParams; mode: ServicesDirectoryMode }) {
  const meta = servicesDirectoryMeta(mode);
  const user = await getCurrentUser();
  const radiusKm = parseRadiusKm(searchParams.radiusKm, 10);
  const cepInfo = searchParams.cep ? await lookupCepWithCoordinates(searchParams.cep) : null;
  const addressInfo = !cepInfo && searchParams.address ? await geocodeFreeformBrazilAddress(searchParams.address) : null;
  const latitude = cepInfo?.latitude ?? addressInfo?.latitude;
  const longitude = cepInfo?.longitude ?? addressInfo?.longitude;
  const state = String(cepInfo?.state || searchParams.state || "").toUpperCase();
  const city = String(cepInfo?.city || searchParams.city || "").trim();
  const district = String(cepInfo?.district || searchParams.district || "").trim();
  const cep = searchParams.cep?.replace(/\D/g, "") ?? "";
  const query = normalize(searchParams.q);
  const category = normalizeCategory(searchParams.category || searchParams.q);
  const audience = isServiceAudience(searchParams.audience) ? searchParams.audience : "";
  const hasActiveSearch = Boolean(searchParams.cep || searchParams.address || searchParams.q || searchParams.category || searchParams.state || searchParams.city || searchParams.district);
  const hasSubmittedSearch = searchParams.searched === "1";
  const showSearchTools = (searchParams as any).modo === "buscar" || hasSubmittedSearch;
  const [services, wantedRequests, manualListings] = await Promise.all([
    hasSubmittedSearch && hasActiveSearch
      ? findServices({ latitude, longitude, radiusKm, state, city, district, cep, query, category, audience, mode })
      : findServices({ radiusKm, state: "", city: "", district: "", cep: "", query: "", category: "", audience: "", mode }),
    searchParams.q ? findActiveWantedRequestsByContext({ q: searchParams.q, context: "SERVICE", limit: 6 }) : Promise.resolve([]),
    findActiveManualListings({ categories: [meta.manualCategory], limit: 12 })
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-center gap-4 sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-yellow-300">{meta.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black">{meta.title}</h1>
        </div>
      </div>

      <CategoryActionButtons searchHref={`${meta.href}?modo=buscar`} announceHref={meta.announceHref} searchLabel={`Buscar ${meta.eyebrow}`} announceLabel={`Anunciar ${meta.eyebrow}`} />

      {showSearchTools ? (
        <div className="mt-5">
          <ServiceSearchShortcuts />
          <ServiceSearchForm
            initialAddress={searchParams.address}
            initialAudience={searchParams.audience}
            initialCategory={searchParams.category}
            initialCep={searchParams.cep}
            initialCity={searchParams.city}
            initialDistrict={searchParams.district}
            initialQuery={searchParams.q}
            initialRadiusKm={String(radiusKm)}
            initialState={searchParams.state}
          />
        </div>
      ) : null}

      {hasSubmittedSearch ? (
        <SearchResultModal
          count={services.length}
          labelSingular={meta.singular}
          labelPlural={meta.plural}
          emptyMessage={`Nenhum ${meta.singular} encontrado com esses filtros.`}
          resetHref={meta.href as Route}
        />
      ) : null}

      {hasSubmittedSearch ? (
        <div className="mt-6">
          <WantedRequestSection
            title={`Procura-se em ${meta.eyebrow.toLowerCase()}`}
            requests={wantedRequests.map((request) => ({
              id: request.id,
              title: request.title,
              description: request.description,
              expiresAt: request.expiresAt,
              owner: {
                name: request.owner.name,
                city: request.owner.city,
                state: request.owner.state
              }
            }))}
          />
        </div>
      ) : null}

      {hasSubmittedSearch ? (
        <ServiceResultReel services={services} resetHref={meta.href as Route} authenticated={Boolean(user)} />
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {manualListings.map((listing) => (
          <ManualListingCard key={listing.id} listing={listing} />
        ))}
        {services.map((service) => (
          <div key={service.id} className="rounded-xl bg-[#A855F7] p-[2px] shadow-[0_0_22px_rgba(168,85,247,0.22)]">
          <article className="flex min-h-full flex-col overflow-hidden rounded-[0.65rem] bg-[linear-gradient(145deg,#151515_0%,#090909_58%,#101f16_100%)] shadow-2xl shadow-black/30">
            <div className="border-b border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <ServiceAvatar service={service} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase text-emerald-300">{service.type === "COMPANY" ? "Empresa Prestadora" : "Profissional Autônomo"}</p>
                    {service.isPro ? <span className="mt-1 inline-flex rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-200">Prestador PRO</span> : null}
                    <h2 className="mt-1 break-words text-lg font-black leading-tight text-white">{service.companyName ?? service.title}</h2>
                    {service.companyName && service.providerName ? <p className="mt-1 break-words text-sm font-bold text-neutral-300">{service.providerName}</p> : null}
                  </div>
                </div>
                <PublicShareButton title={`Achei este profissional: ${service.title}`} path={serviceSharePath(service)} compact />
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="grid grid-cols-2 gap-2">
                {service.categories.map((item) => (
                  <span key={item} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-2 py-3 text-center text-[10px] font-black uppercase leading-tight text-emerald-50 shadow-[0_0_18px_rgba(34,197,94,0.10)]">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#22C55E] text-black shadow-[0_0_16px_rgba(34,197,94,0.28)]">
                      <ServiceCategoryIcon value={item} size={24} strokeWidth={2.8} />
                    </span>
                    <span>{item}</span>
                  </span>
                ))}
              </div>

              {publicServiceDescription(service) ? <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-neutral-300">{publicServiceDescription(service)}</p> : null}

              <div className="mt-4 grid gap-2 text-sm text-neutral-300">
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>{publicServiceAreaText(service.serviceAreas)}</span>
                </p>
                {service.distanceKm !== null ? (
                  <p className="flex items-center gap-2 font-bold text-emerald-200">
                    <MapPin size={16} />
                    {service.distanceKm} km de distância
                  </p>
                ) : null}
                {service.businessHours ? (
                  <p className="flex items-start gap-2">
                    <Clock3 size={16} className="mt-0.5 shrink-0 text-yellow-300" />
                    <span>Atendimento: {service.businessHours}</span>
                  </p>
                ) : null}
              </div>

              <ServiceTrust service={service} />

              <div className="mt-auto pt-1">
                <ServiceContactButton serviceId={service.id} serviceTitle={service.title} authenticated={Boolean(user)} contactPublicEnabled={service.contactPublicEnabled} />
              </div>
            </div>
          </article>
          </div>
        ))}
        {!services.length && !manualListings.length ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-neutral-900 p-4 text-neutral-300 md:col-span-2 lg:col-span-3">
            {hasSubmittedSearch ? `Nenhum ${meta.singular} encontrado dentro da região informada. Ajuste a busca, bairro ou raio.` : `Nenhum ${meta.singular} ativo para exibir no momento.`}
          </div>
        ) : null}
      </section>
    </main>
  );
}

async function findServices(input: { latitude?: number; longitude?: number; radiusKm: number; state: string; city: string; district: string; cep: string; query: string; category: string; audience: string; mode: ServicesDirectoryMode }): Promise<PublicService[]> {
  const supabase = getSupabaseAdmin();
  if (input.latitude !== undefined && input.longitude !== undefined) {
    const { data, error } = await supabase.rpc("search_service_profiles_by_radius", {
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_radius_km: input.radiusKm,
      p_state: input.state || null,
      p_category: input.category || null,
      p_query: input.query || null
    });
    if (error) throw error;
    const textLocationProfiles = await findProfilesByTextLocation(input);
    const services = filterByDirectoryMode(filterByAudience(mergeServices(((data ?? []) as SearchRow[]).map(fromSearchRow), textLocationProfiles), input.audience), input.mode).filter((service) => isServiceVisibleByBilling(service.complemento));
    return (await orderAndRecordServiceSearchExposure(supabase, services)).slice(0, serviceSearchLimit);
  }

  let request = supabase
    .from("service_profiles")
    .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,descricao,experiencia,horario_atendimento,cidade,bairro,cep,estado,foto_perfil,logo_empresa,avaliacao_media,total_avaliacoes,total_servicos,tempo_resposta_minutos,conta_verificada,rank,score,complemento")
    .eq("active", true)
    .in("status", ["ACTIVE", "INACTIVE"])
    .limit(serviceSearchLimit);

  const locationNeedle = serviceLocationNeedle(input);
  if (locationNeedle) {
    request = request.ilike("search_text", `%${locationNeedle}%`);
  } else if (input.state) {
    request = request.eq("estado", input.state);
  }
  if (input.category) request = request.or(`categoria_servico.eq.${input.category},categorias_servico.cs.{${input.category}}`);
  if (input.query) request = request.ilike("search_text", `%${input.query}%`);

  const { data: profiles, error } = await request;
  if (error) throw error;

  const profileServices = (profiles ?? []).map((profile) => ({
    id: profile.id,
    type: profile.tipo_cadastro,
    title: serviceTitle(profile.nome_fantasia, profile.name, profile.categoria_servico),
    companyName: publicCompanyName(profile.nome_fantasia),
    providerName: publicProviderName(profile.name, profile.nome_fantasia),
    category: profile.categoria_servico,
    categories: profile.categorias_servico.map(categoryName),
    description: profile.descricao,
    experience: profile.experiencia,
    businessHours: profile.horario_atendimento,
    city: profile.cidade,
    state: profile.estado,
    serviceAreas: publicServiceAreas(profile.cidade, profile.estado, profile.complemento),
    imageUrl: serviceProfileImage(profile.logo_empresa, profile.foto_perfil, profile.complemento),
    averageRating: profile.avaliacao_media,
    totalRatings: profile.total_avaliacoes,
    totalServices: profile.total_servicos,
    responseMinutes: profile.tempo_resposta_minutos,
    verified: profile.conta_verificada,
    rank: profile.rank,
    score: profile.score,
    distanceKm: null,
    contactPublicEnabled: isServicePublicContactEnabled(profile.complemento),
    isPro: isServicePro(profile.complemento),
    complemento: profile.complemento
  }));
  return (await orderAndRecordServiceSearchExposure(supabase, filterByDirectoryMode(filterByAudience(profileServices, input.audience), input.mode).filter((service) => isServiceVisibleByBilling(service.complemento)))).slice(0, serviceSearchLimit);
}

async function findProfilesByTextLocation(input: { state: string; city: string; district: string; query: string; category: string }): Promise<PublicService[]> {
  const locationNeedle = serviceLocationNeedle(input);
  if (!locationNeedle) return [];

  const supabase = getSupabaseAdmin();
  let request = supabase
    .from("service_profiles")
    .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,descricao,experiencia,horario_atendimento,cidade,bairro,cep,estado,foto_perfil,logo_empresa,avaliacao_media,total_avaliacoes,total_servicos,tempo_resposta_minutos,conta_verificada,rank,score,complemento")
    .eq("active", true)
    .in("status", ["ACTIVE", "INACTIVE"])
    .ilike("search_text", `%${locationNeedle}%`)
    .limit(serviceSearchLimit);

  if (input.category) request = request.or(`categoria_servico.eq.${input.category},categorias_servico.cs.{${input.category}}`);
  if (input.query) request = request.ilike("search_text", `%${input.query}%`);

  const { data, error } = await request;
  if (error) throw error;
  return ((data ?? []) as SearchRow[]).map(fromSearchRow).map((service) => ({ ...service, distanceKm: null })).filter((service) => isServiceVisibleByBilling(service.complemento));
}

function serviceLocationNeedle(input: { state?: string; city?: string; district?: string }) {
  if (input.city) return normalize([input.state, input.city, input.district].filter(Boolean).join(" ")).trim();
  if (input.district) return normalize([input.state, input.district].filter(Boolean).join(" ")).trim();
  return "";
}
function mergeServices(priority: PublicService[], rest: PublicService[]) {
  const seen = new Set<string>();
  return [...priority, ...rest].filter((service) => {
    const key = serviceIdentityKey(service);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterByAudience(services: PublicService[], audience: string) {
  if (!isServiceAudience(audience)) return services;
  return services.filter((service) => {
    if (audienceForService(service.category) === audience) return true;
    return service.categories.some((item) => audienceForService(item) === audience);
  });
}

function filterByDirectoryMode(services: PublicService[], mode: ServicesDirectoryMode) {
  return services.filter((service) => mode === "companies" ? service.type === "COMPANY" : service.type !== "COMPANY");
}

function CategoryActionButtons({ searchHref, announceHref, searchLabel, announceLabel }: { searchHref: Route | string; announceHref: Route | string; searchLabel: string; announceLabel: string }) {
  return (
    <section className="mt-5 grid gap-3 rounded-3xl border border-yellow-300/25 bg-neutral-950/80 p-3 shadow-[0_0_30px_rgba(250,204,21,0.12)] sm:grid-cols-2 sm:p-4">
      <Link href={searchHref as Route} className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#22C55E] px-4 text-center text-sm font-black uppercase text-black shadow-[0_0_18px_rgba(34,197,94,0.22)] transition hover:-translate-y-0.5 hover:bg-[#34D399]">
        {searchLabel}
      </Link>
      <Link href={announceHref as Route} className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-yellow-300 px-4 text-center text-sm font-black uppercase text-black shadow-[0_0_18px_rgba(250,204,21,0.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
        {announceLabel}
      </Link>
    </section>
  );
}

function servicesDirectoryMeta(mode: ServicesDirectoryMode) {
  if (mode === "companies") {
    return {
      eyebrow: "Empresas",
      title: "Empresas PERTO de Você",
      singular: "empresa",
      plural: "empresas",
      href: "/empresas" as const,
      announceHref: "/servicos/planos" as const,
      manualCategory: "COMPANY" as const
    };
  }
  return {
    eyebrow: "Serviços",
    title: "Serviços PERTO de Você",
    singular: "serviço",
    plural: "serviços",
    href: "/servicos" as const,
    announceHref: "/servicos/planos" as const,
    manualCategory: "SERVICE" as const
  };
}

function serviceIdentityKey(service: PublicService) {
  const title = normalize(service.title).replace(/[^a-z0-9]+/g, "");
  return title ? `${title}:${service.id}` : service.id;
}

function serviceSharePath(service: PublicService) {
  return `/servicos/${service.id}`;
}

function ServiceAvatar({ service }: { service: PublicService }) {
  if (service.imageUrl) {
    return <img src={service.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md border border-white/10 bg-black object-contain aspect-square" />;
  }
  const Icon = serviceCategoryIconComponent(service.category);
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-[#22C55E] text-black">
      <Icon size={24} />
    </span>
  );
}

function ServiceTrust({ service }: { service: PublicService }) {
  const rankLabel = service.rank === "FEATURED" ? "Medalha Diamante" : `Medalha ${rankName(service.rank)}`;
  const publicScore = Math.round(service.score / 10);
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-neutral-300">
      <strong className="flex items-center gap-1.5 text-sm text-white">
        <ShieldCheck size={15} className="text-emerald-300" />
        {rankLabel}
      </strong>
      {service.isPro ? <p className="mt-2 inline-flex rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2 py-1 text-[11px] font-black uppercase text-emerald-200">Plano PRO ativo</p> : null}
      <div className="mt-2 grid gap-1.5">
        <span className="flex items-center gap-1.5">
          <Star size={14} className="text-emerald-300" />
          {service.averageRating || "Novo"}/5 · {service.totalRatings} avaliações · {service.totalServices} serviços
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck size={14} className="text-emerald-300" />
          Nota {publicScore}/10{service.verified ? " · Conta verificada" : ""}
        </span>
      </div>
    </div>
  );
}

function fromSearchRow(row: SearchRow): PublicService {
  return {
    id: row.id,
    type: row.tipo_cadastro,
    title: serviceTitle(row.nome_fantasia, row.name, row.categoria_servico),
    companyName: publicCompanyName(row.nome_fantasia),
    providerName: publicProviderName(row.name, row.nome_fantasia),
    category: row.categoria_servico,
    categories: row.categorias_servico.map(categoryName),
    description: row.descricao,
    experience: row.experiencia,
    businessHours: row.horario_atendimento,
    city: row.cidade,
    state: row.estado,
    serviceAreas: publicServiceAreas(row.cidade, row.estado, row.complemento),
    imageUrl: serviceProfileImage(row.logo_empresa, row.foto_perfil, row.complemento),
    averageRating: row.avaliacao_media,
    totalRatings: row.total_avaliacoes,
    totalServices: row.total_servicos,
    responseMinutes: row.tempo_resposta_minutos,
    verified: row.conta_verificada,
    rank: row.rank,
    score: row.score,
    distanceKm: row.distance_km,
    contactPublicEnabled: isServicePublicContactEnabled(row.complemento),
    isPro: isServicePro(row.complemento),
    complemento: row.complemento
  };
}

function normalize(value?: string) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeCategory(value?: string) {
  if (!value) return "";
  const normalized = normalize(value);
  return defaultServiceCategories.find((item) => normalize(item.name) === normalized || item.slug === value)?.slug ?? normalizeServiceSlug(value);
}

function categoryName(slug: string) {
  return defaultServiceCategories.find((item) => item.slug === slug)?.name ?? slug;
}

function serviceTitle(companyName: string | null, providerName: string | null, category: string) {
  return publicCompanyName(companyName) ?? publicProviderName(providerName, companyName) ?? categoryName(category);
}

function rankName(rank: string) {
  if (rank === "GOLD") return "Ouro";
  if (rank === "SILVER") return "Prata";
  return "Bronze";
}

function serviceProfileImage(logo: string | null | undefined, photo: string | null | undefined, complement: string | null | undefined) {
  const serviceImages = parseServiceImages(complement);
  if (serviceImages[0]) return serviceImages[0];
  const billing = serviceBillingFromComplement(complement);
  return isPaidServicePlanCode(billing.planCode) && billing.status !== "HIDDEN" ? logo ?? photo ?? null : null;
}

function parseServiceImages(complement: string | null | undefined) {
  try {
    const parsed = JSON.parse(String(complement || "{}")) as { serviceImages?: unknown };
    return Array.isArray(parsed.serviceImages)
      ? parsed.serviceImages.filter((item): item is string => typeof item === "string" && /^https?:\/\//.test(item)).slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

function isServicePro(complement: string | null | undefined) {
  const billing = serviceBillingFromComplement(complement);
  return isPaidServicePlanCode(billing.planCode) && billing.status === "ACTIVE";
}

function publicCompanyName(value: string | null | undefined) {
  const name = String(value ?? "").trim();
  if (!name || looksLikeFiscalName(name)) return null;
  return name;
}

function publicProviderName(value: string | null | undefined, companyName?: string | null) {
  const name = String(value ?? "").trim();
  if (!name || name === companyName || looksLikeFiscalName(name)) return null;
  return name;
}

function publicServiceDescription(service: PublicService) {
  const description = String(service.description ?? "").trim();
  if (!description || looksLikeAutoFiscalDescription(description, service)) return null;
  return description;
}

function looksLikeAutoFiscalDescription(description: string, service: PublicService) {
  const normalizedDescription = normalize(description);
  const names = [service.title, service.companyName, service.providerName].filter((item): item is string => Boolean(item)).map((item) => normalize(item));
  if (names.some((name) => name && normalizedDescription.startsWith(`${name} atende em`))) return true;
  return looksLikeFiscalName(description.split(" atende em ")[0] ?? "");
}

function looksLikeFiscalName(value: string) {
  const text = String(value ?? "").trim();
  return /^\d{2}\.?\d{3}\.?\d{3}/.test(text) || /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-?\d{2}\b/.test(text);
}
