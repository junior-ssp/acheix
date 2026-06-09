import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatCep } from "@/lib/formatters";
import { geocodeFreeformBrazilAddress, lookupCepWithCoordinates, parseRadiusKm } from "@/lib/geolocation";
import { audienceForService, defaultServiceCategories, normalizeServiceSlug } from "@/lib/service-catalog";
import { isServiceVisibleByBilling } from "@/lib/service-billing-policy";
import { isServicePublicContactEnabled } from "@/lib/service-contact-disclosure";
import { orderAndRecordServiceSearchExposure } from "@/lib/service-search-exposure";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ServiceContactButton } from "@/components/service-contact-button";
import { ServiceFoundPopup } from "@/components/service-found-popup";
import { ServiceSearchForm } from "@/components/service-search-form";
import { PublicShareButton } from "@/components/public-share-button";
import { ServiceCategoryIcon, serviceCategoryIconComponent } from "@/components/service-category-icon";

export const dynamic = "force-dynamic";

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
};

type PublicService = {
  id: string;
  type: string;
  title: string;
  category: string;
  categories: string[];
  description: string;
  experience: string | null;
  businessHours: string | null;
  city: string;
  district: string | null;
  state: string;
  cep: string | null;
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



export default async function ServicesPage({ searchParams }: { searchParams: ServicesPageParams }) {
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
  const audience = searchParams.audience === "VEHICLE" || searchParams.audience === "REAL_ESTATE" ? searchParams.audience : "";
  const hasActiveSearch = Boolean(searchParams.cep || searchParams.address || searchParams.q || searchParams.category || searchParams.state || searchParams.city || searchParams.district);
  const services = hasActiveSearch ? await findServices({ latitude, longitude, radiusKm, state, city, district, cep, query, category, audience }) : [];
  const hasSearchResults = hasActiveSearch && services.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-yellow-300">Serviços</p>
          <h1 className="mt-2 text-3xl font-black">Profissionais PERTO de Você</h1>
        </div>
        <Link href="/servicos/anunciar" className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">
          Sou Profissional
        </Link>
      </div>

      {hasSearchResults ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div>
            <p className="text-sm font-black uppercase text-emerald-200">Resultado da pesquisa</p>
            <p className="mt-1 text-sm text-neutral-200">
              {services.length} profissional{services.length === 1 ? "" : "ais"} encontrado{services.length === 1 ? "" : "s"}
              {latitude !== undefined && longitude !== undefined ? ` em até ${radiusKm} km, com rodízio justo de exibição.` : "."}
            </p>
          </div>
          <Link href="/servicos" className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-black btn-gold">
            Refazer Pesquisa
          </Link>
        </div>
      ) : (
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
      )}
      <ServiceFoundPopup show={hasActiveSearch} resultCount={services.length} />

      {hasActiveSearch ? (
      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.id} className="rounded-lg border border-white/10 bg-neutral-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <ServiceAvatar service={service} />
                <div className="min-w-0">
                  <h2 className="break-words font-black">{service.title}</h2>
                  <p className="text-xs font-bold uppercase text-yellow-300">{service.categories[0]}</p>
                </div>
              </div>
              <PublicShareButton title={`Achei este profissional: ${service.title}`} path={serviceSharePath(service)} compact />
            </div>
            <p className="mt-3 line-clamp-4 text-sm text-neutral-300">{service.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {service.categories.map((item) => (
                <span key={item} className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 text-xs font-black uppercase text-neutral-100">
                  <ServiceCategoryIcon value={item} size={13} />
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-3 grid gap-1 text-sm text-neutral-400">
              <p>{service.district ? `${service.district}, ` : ""}{service.city}/{service.state}{service.cep ? ` - CEP ${formatCep(service.cep)}` : ""}</p>
              {service.distanceKm !== null ? <p className="font-bold text-emerald-200">{service.distanceKm} km de distância</p> : null}
              {service.businessHours ? <p>Atendimento: {service.businessHours}</p> : null}
            </div>
            <ServiceTrust service={service} />
            <ServiceContactButton serviceId={service.id} serviceTitle={service.title} authenticated={Boolean(user)} contactPublicEnabled={service.contactPublicEnabled} />
          </article>
        ))}
        {!services.length ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-neutral-900 p-4 text-neutral-300 md:col-span-2 lg:col-span-3">
            Nenhum profissional encontrado dentro da região informada. Ajuste a profissão, bairro ou raio de busca.
          </div>
        ) : null}
      </section>
      ) : null}
    </main>
  );
}

async function findServices(input: { latitude?: number; longitude?: number; radiusKm: number; state: string; city: string; district: string; cep: string; query: string; category: string; audience: string }): Promise<PublicService[]> {
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
    const services = filterByAudience(mergeServices(((data ?? []) as SearchRow[]).map(fromSearchRow), textLocationProfiles), input.audience).filter((service) => isServiceVisibleByBilling(service.complemento));
    return orderAndRecordServiceSearchExposure(supabase, services);
  }

  let request = supabase
    .from("service_profiles")
    .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,descricao,experiencia,horario_atendimento,cidade,bairro,cep,estado,foto_perfil,logo_empresa,avaliacao_media,total_avaliacoes,total_servicos,tempo_resposta_minutos,conta_verificada,rank,score,complemento")
    .eq("active", true)
    .in("status", ["ACTIVE", "INACTIVE"])
    .limit(200);

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
    title: profile.nome_fantasia ?? profile.name ?? categoryName(profile.categoria_servico),
    category: profile.categoria_servico,
    categories: profile.categorias_servico.map(categoryName),
    description: profile.descricao,
    experience: profile.experiencia,
    businessHours: profile.horario_atendimento,
    city: profile.cidade,
    district: profile.bairro,
    state: profile.estado,
    cep: profile.cep,
    imageUrl: profile.tipo_cadastro === "COMPANY" ? profile.logo_empresa : profile.foto_perfil,
    averageRating: profile.avaliacao_media,
    totalRatings: profile.total_avaliacoes,
    totalServices: profile.total_servicos,
    responseMinutes: profile.tempo_resposta_minutos,
    verified: profile.conta_verificada,
    rank: profile.rank,
    score: profile.score,
    distanceKm: null,
    contactPublicEnabled: isServicePublicContactEnabled(profile.complemento),
    complemento: profile.complemento
  }));
  return orderAndRecordServiceSearchExposure(supabase, filterByAudience(profileServices, input.audience).filter((service) => isServiceVisibleByBilling(service.complemento)));
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
    .limit(200);

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
  if (audience !== "VEHICLE" && audience !== "REAL_ESTATE") return services;
  return services.filter((service) => {
    if (audienceForService(service.category) === audience) return true;
    return service.categories.some((item) => audienceForService(item) === audience);
  });
}

function serviceIdentityKey(service: PublicService) {
  const title = normalize(service.title).replace(/[^a-z0-9]+/g, "");
  const cep = service.cep?.replace(/\D/g, "") || "";
  return cep || title ? `${title}:${cep}` : service.id;
}

function serviceSharePath(service: PublicService) {
  return `/servicos/${service.id}`;
}

function ServiceAvatar({ service }: { service: PublicService }) {
  if (service.imageUrl) {
    return <img src={service.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-white/10 object-cover aspect-square" />;
  }
  const Icon = serviceCategoryIconComponent(service.category);
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-yellow-300 text-black">
      <Icon size={22} />
    </span>
  );
}

function ServiceTrust({ service }: { service: PublicService }) {
  const rankLabel = service.rank === "FEATURED" ? "Medalha Diamante" : `Medalha ${rankName(service.rank)}`;
  const publicScore = Math.round(service.score / 10);
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-neutral-300">
      <strong className="flex items-center gap-1 text-sm text-white">
        <ShieldCheck size={15} />
        {rankLabel}
      </strong>
      <span>{service.averageRating || "Novo"}/5 · {service.totalRatings} avaliações · {service.totalServices} serviços · Nota {publicScore}/10</span>
    </div>
  );
}

function fromSearchRow(row: SearchRow): PublicService {
  return {
    id: row.id,
    type: row.tipo_cadastro,
    title: row.nome_fantasia ?? row.name ?? categoryName(row.categoria_servico),
    category: row.categoria_servico,
    categories: row.categorias_servico.map(categoryName),
    description: row.descricao,
    experience: row.experiencia,
    businessHours: row.horario_atendimento,
    city: row.cidade,
    district: row.bairro,
    state: row.estado,
    cep: row.cep,
    imageUrl: row.tipo_cadastro === "COMPANY" ? row.logo_empresa : row.foto_perfil,
    averageRating: row.avaliacao_media,
    totalRatings: row.total_avaliacoes,
    totalServices: row.total_servicos,
    responseMinutes: row.tempo_resposta_minutos,
    verified: row.conta_verificada,
    rank: row.rank,
    score: row.score,
    distanceKm: row.distance_km,
    contactPublicEnabled: isServicePublicContactEnabled(row.complemento),
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

function rankName(rank: string) {
  if (rank === "GOLD") return "Ouro";
  if (rank === "SILVER") return "Prata";
  return "Bronze";
}
