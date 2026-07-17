import Link from "next/link";
import type { Route } from "next";
import { Building2, Car, HomeIcon, Package, Search, Wrench } from "lucide-react";
import { ListingResults } from "@/components/listing-results";
import { ManualListingCard } from "@/components/manual-listing-card";
import { SearchPanel } from "@/components/search-panel";
import { WantedRequestSection } from "@/components/wanted-request-section";
import type { ListingSearchParams } from "@/lib/listing-search";
import { findActiveManualListings, type ManualListing } from "@/lib/manual-listings";
import { isServiceVisibleByBilling } from "@/lib/service-billing-policy";
import { isPaidServicePlanCode } from "@/lib/service-plans";
import { parseServiceComplement } from "@/lib/service-contact-disclosure";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { findActiveWantedRequestsByContext } from "@/lib/wanted-requests";

export const dynamic = "force-dynamic";

type SearchService = {
  id: string;
  title: string;
  type: string;
  category: string;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  isPro: boolean;
};

export default async function SearchPage({ searchParams }: { searchParams: ListingSearchParams }) {
  const hasSubmittedSearch = searchParams.searched === "1";
  const query = String(searchParams.q ?? "").trim();
  const [vehicleWantedRequests, realEstateWantedRequests, serviceWantedRequests, manualListings, services] = hasSubmittedSearch
    ? await Promise.all([
        query ? findActiveWantedRequestsByContext({ q: query, context: "VEHICLE", limit: 3 }) : Promise.resolve([]),
        query ? findActiveWantedRequestsByContext({ q: query, context: "REAL_ESTATE", limit: 3 }) : Promise.resolve([]),
        query ? findActiveWantedRequestsByContext({ q: query, context: "SERVICE", limit: 3 }) : Promise.resolve([]),
        findGlobalManualListings(query, searchParams),
        findGlobalServices(query)
      ])
    : [[], [], [], [], []];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-yellow-300">Busca</p>
      </div>

      <SearchPanel q={searchParams.q} category={searchParams.category} type={searchParams.type} brand={searchParams.brand} fuel={searchParams.fuel} min={searchParams.min} max={searchParams.max} purpose={searchParams.purpose} sort={searchParams.sort} />
      <SearchCategoryShortcuts />

      {hasSubmittedSearch ? (
        <section id="resultados-anuncios" className="mt-6 scroll-mt-24">
          <h2 className="mb-3 text-xl font-black">Anúncios encontrados</h2>
          <ListingResults searchParams={searchParams} manualListings={manualListings} emptyTitle="Nenhum anúncio encontrado na busca geral." />
        </section>
      ) : null}

      {hasSubmittedSearch && services.length ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-black">Empresas e serviços encontrados</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceSearchCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      ) : null}

      {hasSubmittedSearch ? (
        <div className="mt-8 grid gap-6">
          <WantedRequestSection title="Procura-se em veículos" requests={vehicleWantedRequests.map(toWantedRequestCard)} />
          <WantedRequestSection title="Procura-se em imóveis" requests={realEstateWantedRequests.map(toWantedRequestCard)} />
          <WantedRequestSection title="Procura-se em empresas e serviços" requests={serviceWantedRequests.map(toWantedRequestCard)} />
        </div>
      ) : null}
    </main>
  );
}

function SearchCategoryShortcuts() {
  const items = [
    { title: "Produtos", href: "/produtos?modo=buscar", icon: Package, accent: "bg-orange-400" },
    { title: "Veículos", href: "/veiculos?modo=buscar", icon: Car, accent: "bg-emerald-400" },
    { title: "Imóveis", href: "/imoveis?modo=buscar", icon: HomeIcon, accent: "bg-sky-400" },
    { title: "Empresas / Lojas", href: "/empresas?modo=buscar", icon: Building2, accent: "bg-purple-400" },
    { title: "Serviços", href: "/servicos?modo=buscar", icon: Wrench, accent: "bg-yellow-300" }
  ] as const;

  return (
    <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.title} href={item.href as Route} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/90 p-3 text-center font-black text-white transition hover:-translate-y-0.5 hover:border-yellow-300/50">
            <span className={`grid h-10 w-10 place-items-center rounded-xl text-black ${item.accent}`}>
              <Icon size={22} strokeWidth={2.7} />
            </span>
            {item.title}
          </Link>
        );
      })}
    </section>
  );
}

function ServiceSearchCard({ service }: { service: SearchService }) {
  return (
    <Link href={`/servicos/${service.id}` as Route} className="flex min-h-28 gap-3 rounded-2xl border border-purple-300/35 bg-neutral-950/90 p-3 transition hover:-translate-y-0.5 hover:border-purple-200">
      {service.imageUrl ? (
        <img src={service.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-purple-400 text-black">
          <Search size={26} strokeWidth={2.8} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[11px] font-black uppercase text-purple-200">{service.type === "COMPANY" ? "Empresa" : "Serviço"}{service.isPro ? " PRO" : ""}</span>
        <strong className="mt-1 line-clamp-2 block text-base font-black text-white">{service.title}</strong>
        <span className="mt-1 line-clamp-1 block text-sm text-neutral-300">{service.category}</span>
        <span className="mt-1 block text-xs text-neutral-400">{[service.city, service.state].filter(Boolean).join(", ")}</span>
      </span>
    </Link>
  );
}

async function findGlobalManualListings(query: string, searchParams: ListingSearchParams): Promise<ManualListing[]> {
  try {
    const listings = await findActiveManualListings({ limit: 60, preferViewerLocation: true, preferredState: searchParams.state, preferredCity: searchParams.city });
    const terms = normalizeTerms(query);
    if (!terms.length) return listings.slice(0, 12);
    return listings.filter((listing) => {
      const haystack = normalize([listing.title, listing.address, listing.category].join(" "));
      return terms.every((term) => haystack.includes(term));
    }).slice(0, 12);
  } catch (error) {
    console.error("global_manual_search_failed", error);
    return [];
  }
}

async function findGlobalServices(query: string): Promise<SearchService[]> {
  if (!query || !isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("service_profiles")
      .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,cidade,estado,foto_perfil,logo_empresa,complemento")
      .eq("active", true)
      .in("status", ["ACTIVE", "INACTIVE"])
      .ilike("search_text", `%${normalize(query)}%`)
      .limit(12);

    if (error) throw error;
    return ((data ?? []) as any[])
      .filter((profile) => isServiceVisibleByBilling(profile.complemento))
      .map((profile) => {
        const complement = parseServiceComplement(profile.complemento);
        const serviceImages = Array.isArray(complement.serviceImages)
          ? complement.serviceImages.filter((item: unknown): item is string => typeof item === "string" && /^https?:\/\//.test(item))
          : [];
        const billingPlanCode = typeof complement.serviceBilling?.planCode === "string" ? complement.serviceBilling.planCode : null;
        const categories = Array.isArray(profile.categorias_servico) && profile.categorias_servico.length ? profile.categorias_servico : [profile.categoria_servico].filter(Boolean);
        return {
          id: profile.id,
          title: profile.nome_fantasia || profile.name || profile.categoria_servico || "Profissional Achei X",
          type: profile.tipo_cadastro,
          category: categories.join(" · "),
          city: profile.cidade,
          state: profile.estado,
          imageUrl: serviceImages[0] ?? profile.logo_empresa ?? profile.foto_perfil ?? null,
          isPro: isPaidServicePlanCode(billingPlanCode)
        };
      });
  } catch (error) {
    console.error("global_service_search_failed", error);
    return [];
  }
}

function toWantedRequestCard(request: Awaited<ReturnType<typeof findActiveWantedRequestsByContext>>[number]) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    expiresAt: request.expiresAt,
    owner: {
      name: request.owner.name,
      city: request.owner.city,
      state: request.owner.state
    }
  };
}

function normalizeTerms(value: string) {
  return normalize(value).split(" ").filter((term) => term.length >= 2);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
