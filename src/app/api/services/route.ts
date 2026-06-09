import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { onlyDigits } from "@/lib/formatters";
import { lookupCepWithCoordinates, parseRadiusKm } from "@/lib/geolocation";
import { errorResponse, json } from "@/lib/http";
import { defaultServiceCategories, normalizeServiceSlug } from "@/lib/service-catalog";
import { ensureServiceBilling, isServiceVisibleByBilling } from "@/lib/service-billing-policy";
import { isPublicServiceContactPreference, isServicePublicContactEnabled, parseServiceComplement, serviceContactDisclosureText, serviceContactDisclosureVersion } from "@/lib/service-contact-disclosure";
import { getServicePlan } from "@/lib/service-plans";
import { orderAndRecordServiceSearchExposure } from "@/lib/service-search-exposure";
import { getSupabaseAdmin } from "@/lib/supabase";
import { newDbId } from "@/lib/supabase-db";
import { serviceProfileSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

const serviceSearchLimit = 80;

type ServiceProfileSearchRow = {
  id: string;
  tipo_cadastro: "INDIVIDUAL" | "COMPANY";
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

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  const url = new URL(request.url);
  const query = normalize(url.searchParams.get("q"));
  const category = normalizeCategory(url.searchParams.get("category") || url.searchParams.get("servico") || url.searchParams.get("q"));
  const state = url.searchParams.get("state")?.trim().toUpperCase();
  const city = url.searchParams.get("city")?.trim();
  const district = url.searchParams.get("district")?.trim();
  const cep = onlyDigits(url.searchParams.get("cep"));
  const radiusKm = parseRadiusKm(url.searchParams.get("radiusKm"), 10);
  const hasActiveSearch = Boolean(query || category || state || city || district || cep || url.searchParams.get("lat") || url.searchParams.get("lng"));
  if (!hasActiveSearch) return json({ services: [], radiusKm });

  const cepInfo = cep ? await lookupCepWithCoordinates(cep) : null;
  const latitude = toNumber(url.searchParams.get("lat")) ?? cepInfo?.latitude;
  const longitude = toNumber(url.searchParams.get("lng")) ?? cepInfo?.longitude;
  const searchState = String(cepInfo?.state || state || "").toUpperCase();
  const searchCity = String(cepInfo?.city || city || "").trim();
  const searchDistrict = String(cepInfo?.district || district || "").trim();

  if (latitude !== undefined && longitude !== undefined) {
    const { data, error } = await supabase.rpc("search_service_profiles_by_radius", {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_km: radiusKm,
      p_state: searchState || null,
      p_category: category || null,
      p_query: query || null
    });
    if (error) throw error;
    const textLocationProfiles = await findProfilesByTextLocation({ searchState, searchCity, searchDistrict, category, query });
    const services = (await orderAndRecordServiceSearchExposure(supabase, mergePublicProfiles((data ?? []).map(toPublicProfile), textLocationProfiles).filter((service) => isServiceVisibleByBilling(service.complemento)))).slice(0, serviceSearchLimit);
    return json({ services: services.map(stripInternalServiceFields), radiusKm, location: { latitude, longitude } });
  }

  let requestBuilder = supabase
    .from("service_profiles")
    .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,descricao,experiencia,horario_atendimento,cidade,bairro,cep,estado,foto_perfil,logo_empresa,avaliacao_media,total_avaliacoes,total_servicos,tempo_resposta_minutos,conta_verificada,rank,score,complemento")
    .eq("active", true)
    .in("status", ["ACTIVE", "INACTIVE"])
    .limit(serviceSearchLimit);

  const locationNeedle = serviceLocationNeedle({ state: searchState, city: searchCity, district: searchDistrict });
  if (locationNeedle) {
    requestBuilder = requestBuilder.ilike("search_text", `%${locationNeedle}%`);
  } else if (searchState) {
    requestBuilder = requestBuilder.eq("estado", searchState);
  }
  if (category) requestBuilder = requestBuilder.or(`categoria_servico.eq.${category},categorias_servico.cs.{${category}}`);
  if (query) requestBuilder = requestBuilder.ilike("search_text", `%${query}%`);

  const { data, error } = await requestBuilder;
  if (error) throw error;

  const services = (await orderAndRecordServiceSearchExposure(supabase, (data ?? []).map((profile) => toPublicProfile({ ...profile, distance_km: null })).filter((service) => isServiceVisibleByBilling(service.complemento)))).slice(0, serviceSearchLimit);
  return json({ services: services.map(stripInternalServiceFields), radiusKm });
}

async function findProfilesByTextLocation(input: { searchState: string; searchCity: string; searchDistrict: string; category: string; query: string }) {
  const locationNeedle = serviceLocationNeedle({ state: input.searchState, city: input.searchCity, district: input.searchDistrict });
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
  return (data ?? []).map((profile) => toPublicProfile({ ...profile, distance_km: null })).filter((service) => isServiceVisibleByBilling(service.complemento));
}

function serviceLocationNeedle(input: { state?: string; city?: string; district?: string }) {
  if (input.city) return normalize([input.state, input.city, input.district].filter(Boolean).join(" ")).trim();
  if (input.district) return normalize([input.state, input.district].filter(Boolean).join(" ")).trim();
  return "";
}

function mergePublicProfiles(priority: any[], rest: any[]) {
  const seen = new Set<string>();
  return [...priority, ...rest].filter((service) => {
    if (seen.has(service.id)) return false;
    seen.add(service.id);
    return true;
  });
}

function stripInternalServiceFields(service: any) {
  const { complemento, ...publicService } = service;
  return publicService;
}
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const user = await requireUser();
    if (user.accountBlockedAt || user.serviceBlockedAt) {
      return json({ error: "Você está bloqueado para publicar serviços. Fale com o suporte do Achei X." }, 403);
    }
    const data = serviceProfileSchema.parse(await request.json());
    const cep = data.cep ? onlyDigits(data.cep) : null;
    const cepInfo = cep ? await lookupCepWithCoordinates(cep) : null;
    const state = String(cepInfo?.state || data.state).trim().toUpperCase();
    const city = String(cepInfo?.city || data.city).trim();
    const district = String(cepInfo?.district || data.district || "").trim() || null;
    const address = String(cepInfo?.address || data.address || "").trim() || null;
    const categories = [...new Set(data.categories.map(normalizeCategory).filter(Boolean))].slice(0, 5);
    const servicePlan = getServicePlan(data.servicePlanCode);
    if (categories.length > servicePlan.maxCategories) {
      return json({ error: `O plano ${servicePlan.name} permite no máximo ${servicePlan.maxCategories} atividades.` }, 422);
    }
    const category = categories[0];
    const title = data.name.trim();
    const locations = (data.locations ?? []).slice(0, 5);
    const description = data.description?.trim() || `${title} atende em ${city}/${state}.`;
    const locationsText = locations.map((location) => [location.state, location.city, location.district, location.cep, location.address].filter(Boolean).join(" ")).join(" ");
    const searchText = normalize([
      title,
      data.companyLegalName,
      data.companyTradeName,
      description,
      categories,
      categories.map(categoryName),
      state,
      city,
      district,
      cep,
      address,
      locationsText
    ].flat().filter(Boolean).join(" "));
    const score = calculateServiceScore({ ratings: 0, totalServices: 0, responseMinutes: null, reports: 0, verified: Boolean(user.identityVerifiedAt) });
    const now = new Date();
    const nowIso = now.toISOString();
    const requestedContactPreference = data.contactPreference;
    const canUsePublicContact = user.accountType === "CNPJ" || Boolean(user.cnpj);
    if (isPublicServiceContactPreference(requestedContactPreference) && !canUsePublicContact) {
      return json({ error: "Exibição pública de telefone ou WhatsApp exige conta profissional/CNPJ." }, 403);
    }
    const contactPreference = canUsePublicContact ? requestedContactPreference : "LEADS_ONLY";
    const publicContactEnabled = isPublicServiceContactPreference(contactPreference);

    if (!category) return json({ error: "Selecione pelo menos uma categoria de serviço." }, 422);

    const { data: existing, error: lookupError } = await supabase
      .from("service_profiles")
      .select("id,complemento")
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const existingComplement = parseServiceComplement(existing?.complemento);
    const serviceBilling = ensureServiceBilling(existingComplement.serviceBilling, now);
    const previousDisclosure = existingComplement.contactDisclosure;
    const hadPublicContact = Boolean(previousDisclosure?.publicContactEnabled && previousDisclosure?.acceptedAt);
    const contactDisclosure = buildContactDisclosure({
      enabled: publicContactEnabled,
      accepted: data.contactDisclosureAccepted,
      previous: previousDisclosure,
      nowIso,
      request
    });
    const complement = JSON.stringify({
      ...existingComplement,
      serviceLocations: locations,
      contactPreference,
      contactDisclosure,
      serviceBilling
    });

    const payload = {
      user_id: user.id,
      tipo_cadastro: data.type,
      categoria_servico: category,
      categorias_servico: categories,
      name: data.type === "INDIVIDUAL" ? title : null,
      razao_social: data.type === "COMPANY" ? data.companyLegalName || title : null,
      nome_fantasia: data.type === "COMPANY" ? data.companyTradeName || title : null,
      document: data.type === "COMPANY" ? onlyDigits(data.document) : onlyDigits(user.cpf),
      descricao: description,
      experiencia: null,
      horario_atendimento: null,
      cep,
      estado: state,
      cidade: city,
      bairro: district,
      endereco: address,
      numero: data.number || null,
      complemento: complement,
      latitude: cepInfo?.latitude ?? null,
      longitude: cepInfo?.longitude ?? null,
      telefone_privado: data.privatePhone ? onlyDigits(data.privatePhone) : null,
      whatsapp_privado: data.privateWhatsapp ? onlyDigits(data.privateWhatsapp) : null,
      email_privado: data.privateEmail || null,
      website: null,
      foto_perfil: null,
      logo_empresa: null,
      conta_verificada: Boolean(user.identityVerifiedAt),
      score,
      rank: rankFromScore(score),
      search_text: searchText,
      active: servicePlan.code === "SERVICE_FREE" || Boolean(existing),
      status: servicePlan.code === "SERVICE_FREE" || existing ? "ACTIVE" : "INACTIVE",
      last_active_at: nowIso,
      activity_confirmation_due_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      activity_prompted_at: null,
      paused_at: null,
      archived_at: null,
      dormant_at: null,
      closed_at: null
    };

    const mutation = existing
      ? supabase
          .from("service_profiles")
          .update(payload)
          .eq("id", existing.id)
          .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,descricao,experiencia,horario_atendimento,cidade,bairro,cep,estado,foto_perfil,logo_empresa,avaliacao_media,total_avaliacoes,total_servicos,tempo_resposta_minutos,conta_verificada,rank,score,complemento")
          .single()
      : supabase
          .from("service_profiles")
          .insert({ id: randomUUID(), ...payload })
          .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,descricao,experiencia,horario_atendimento,cidade,bairro,cep,estado,foto_perfil,logo_empresa,avaliacao_media,total_avaliacoes,total_servicos,tempo_resposta_minutos,conta_verificada,rank,score,complemento")
          .single();

    const { data: profile, error } = await mutation;

    if (error) throw error;

    if (publicContactEnabled && data.contactDisclosureAccepted) {
      await insertServiceDisclosureAudit(user.id, profile.id, "service.contact_disclosure.accepted", contactDisclosure);
    } else if (hadPublicContact && !publicContactEnabled) {
      await insertServiceDisclosureAudit(user.id, profile.id, "service.contact_disclosure.revoked", contactDisclosure);
    }

    if (servicePlan.code === "SERVICE_PRO") {
      const { data: payment, error: paymentError } = await supabase
        .from("Payment")
        .insert({
          id: newDbId(),
          userId: user.id,
          amountCents: servicePlan.priceCents,
          status: "PENDING",
          provider: "PIX",
          providerRef: `service:${profile.id}:${servicePlan.code}:${Date.now()}`
        })
        .select("*")
        .single();
      if (paymentError) throw paymentError;
      return json({ service: toPublicProfile({ ...profile, distance_km: null }), payment, checkoutUrl: `/pagamento?paymentId=${payment.id}` }, 201);
    }

    return json({ service: toPublicProfile({ ...profile, distance_km: null }) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

function buildContactDisclosure(input: { enabled: boolean; accepted: boolean; previous: any; nowIso: string; request: Request }) {
  if (!input.enabled) {
    return {
      ...(input.previous ?? {}),
      publicContactEnabled: false,
      revokedAt: input.nowIso,
      revokedIp: requestIp(input.request),
      revokedUserAgent: input.request.headers.get("user-agent") ?? "unknown"
    };
  }

  if (!input.accepted) return input.previous ?? { publicContactEnabled: false };

  return {
    publicContactEnabled: true,
    acceptedAt: input.nowIso,
    termsVersion: serviceContactDisclosureVersion,
    termsTitle: "Termo de Responsabilidade e Autorização de Divulgação de Contatos",
    termsText: serviceContactDisclosureText(),
    acceptedIp: requestIp(input.request),
    acceptedUserAgent: input.request.headers.get("user-agent") ?? "unknown"
  };
}

async function insertServiceDisclosureAudit(userId: string, profileId: string, action: string, disclosure: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin().from("AuditLog").insert({
    id: newDbId(),
    userId,
    action,
    metadata: { profileId, disclosure }
  });
  if (error) throw error;
}

function toPublicProfile(profile: any) {
  const type = profile.tipo_cadastro;
  const category = profile.categoria_servico;
  const categories = profile.categorias_servico ?? [category];
  return {
    id: profile.id,
    type,
    title: profile.nome_fantasia ?? profile.name ?? categoryName(category),
    category,
    categories: categories.map(categoryName),
    description: profile.descricao,
    experience: profile.experiencia,
    businessHours: profile.horario_atendimento,
    city: profile.cidade,
    district: profile.bairro,
    state: profile.estado,
    cep: profile.cep,
    imageUrl: null,
    averageRating: profile.avaliacao_media,
    totalRatings: profile.total_avaliacoes,
    totalServices: profile.total_servicos,
    responseMinutes: profile.tempo_resposta_minutos,
    verified: profile.conta_verificada,
    rank: profile.rank,
    score: profile.score,
    distanceKm: profile.distance_km,
    contactPublicEnabled: isServicePublicContactEnabled(profile.complemento),
    complemento: profile.complemento
  };
}

function categoryName(slug: string) {
  return defaultServiceCategories.find((item) => item.slug === slug)?.name ?? slug;
}

function normalizeCategory(value: string | null | undefined) {
  if (!value) return "";
  const byName = defaultServiceCategories.find((item) => normalize(item.name) === normalize(value) || item.slug === value);
  return byName?.slug ?? normalizeServiceSlug(value);
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function toNumber(value: string | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function calculateServiceScore(input: { ratings: number; totalServices: number; responseMinutes: number | null; reports: number; verified: boolean }) {
  const ratingPoints = Math.round(input.ratings * 40);
  const volumePoints = Math.min(input.totalServices * 3, 25);
  const responsePoints = input.responseMinutes === null ? 5 : input.responseMinutes <= 60 ? 20 : input.responseMinutes <= 240 ? 12 : 5;
  const verifiedPoints = input.verified ? 10 : 0;
  const reportPenalty = Math.min(input.reports * 15, 60);
  return Math.max(0, Math.min(100, ratingPoints + volumePoints + responsePoints + verifiedPoints - reportPenalty));
}

function rankFromScore(score: number) {
  if (score >= 90) return "FEATURED";
  if (score >= 75) return "GOLD";
  if (score >= 50) return "SILVER";
  return "BRONZE";
}
