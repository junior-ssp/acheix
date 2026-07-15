import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { Route } from "next";
import { Search, Wrench } from "lucide-react";
import { Fragment } from "react";
import { EmptyState } from "@/components/empty-state";
import { HomeCategoryActions } from "@/components/home-category-actions";
import { HomeMobileListingGrid } from "@/components/home-mobile-listing-grid";
import { ManualListingCard } from "@/components/manual-listing-card";
import { SearchPanel } from "@/components/search-panel";
import { SponsoredBannerCarousel, SponsoredDesktopHeroBanner } from "@/components/sponsored-banner-carousel";
import { WantedRequestCard } from "@/components/wanted-request-card";
import { withTimeout } from "@/lib/async";
import { findActiveBannerSlots, findActiveDesktopHeroBanner } from "@/lib/banner-campaigns";
import { findHomeListings } from "@/lib/listing-search";
import { isServiceVisibleByBilling } from "@/lib/service-billing-policy";
import { parseServiceComplement } from "@/lib/service-contact-disclosure";
import { isPaidServicePlanCode } from "@/lib/service-plans";
import { publicServiceAreas, publicServiceAreaText } from "@/lib/service-public-location";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { findActiveWantedRequests, findActiveWantedRequestsByContext } from "@/lib/wanted-requests";
import { findActiveManualListings, type ManualListing } from "@/lib/manual-listings";

export const dynamic = "force-dynamic";

const getCachedHomeListings = unstable_cache(
  () => findHomeListings(8),
  ["acheix-home-listings-v2"],
  { revalidate: 30 }
);

const getCachedHomeProfessionals = unstable_cache(
  () => findHomeProfessionals(12),
  ["acheix-home-professionals-v1"],
  { revalidate: 60 }
);

const getCachedHomeBannerSlots = unstable_cache(
  () => findActiveBannerSlots(5),
  ["acheix-home-banner-slots-v1"],
  { revalidate: 60 }
);

const getCachedWantedRequests = unstable_cache(
  () => findActiveWantedRequests(6),
  ["acheix-home-wanted-requests-all-v1"],
  { revalidate: 30, tags: ["acheix-wanted-requests"] }
);

const getCachedVehicleWantedRequests = unstable_cache(
  () => findActiveWantedRequestsByContext({ context: "VEHICLE", limit: 6 }),
  ["acheix-home-wanted-requests-vehicle-v1"],
  { revalidate: 30, tags: ["acheix-wanted-requests"] }
);

const getCachedRealEstateWantedRequests = unstable_cache(
  () => findActiveWantedRequestsByContext({ context: "REAL_ESTATE", limit: 6 }),
  ["acheix-home-wanted-requests-real-estate-v1"],
  { revalidate: 30, tags: ["acheix-wanted-requests"] }
);

const getCachedDesktopHeroBanner = unstable_cache(
  () => findActiveDesktopHeroBanner(),
  ["acheix-home-desktop-hero-banner-v1"],
  { revalidate: 60 }
);

const getCachedManualListings = unstable_cache(
  () => findActiveManualListings({ limit: 18 }),
  ["acheix-home-manual-listings-v1"],
  { revalidate: 30, tags: ["acheix-manual-listings"] }
);

export default async function Home() {
  const [
    homeListings,
    professionals,
    activeBannerSlots,
    activeDesktopHeroBanner,
    wantedRequests,
    vehicleWantedRequests,
    rawRealEstateWantedRequests,
    manualListings
  ] = await Promise.all([
    withTimeout(getCachedHomeListings(), { vehicles: [], realEstate: [], products: [] }, 1400),
    withTimeout(getCachedHomeProfessionals(), [], 1200),
    withTimeout(getCachedHomeBannerSlots(), [], 900),
    withTimeout(getCachedDesktopHeroBanner(), null, 900),
    withTimeout(getCachedWantedRequests(), [], 900),
    withTimeout(getCachedVehicleWantedRequests(), [], 900),
    withTimeout(getCachedRealEstateWantedRequests(), [], 900),
    withTimeout(getCachedManualListings(), [], 900)
  ]);
  const vehicles = homeListings.vehicles;
  const realEstate = homeListings.realEstate;
  const products = homeListings.products;
  const productManualListings = manualListings.filter((listing) => listing.category === "PRODUCT");
  const vehicleManualListings = manualListings.filter((listing) => listing.category === "VEHICLE");
  const realEstateManualListings = manualListings.filter((listing) => listing.category === "REAL_ESTATE");
  const companyManualListings = manualListings.filter((listing) => listing.category === "COMPANY");
  const onlyServiceManualListings = manualListings.filter((listing) => listing.category === "SERVICE");
  const serviceManualListings = manualListings.filter((listing) => listing.category === "COMPANY" || listing.category === "SERVICE");
  const companyProfessionals = professionals.filter((professional) => professional.type === "COMPANY");
  const serviceProfessionals = professionals.filter((professional) => professional.type !== "COMPANY");
  const desktopProfessionals = professionals.slice(0, 6);
  const vehicleWantedIds = new Set(vehicleWantedRequests.map((request) => request.id));
  const realEstateWantedRequests = rawRealEstateWantedRequests.filter((request) => !vehicleWantedIds.has(request.id));
  const bannerSlots = activeBannerSlots.map((slot, index) => ({
    id: slot.campaignId,
    label: `Banner ${index + 1}`,
    title: slot.campaignTitle,
    mediaUrl: slot.mediaUrl,
    imagePositionY: slot.bannerImagePositionY,
    imageZoom: slot.imageZoom,
    imagePositionX: slot.imagePositionX,
    rainbowBorderEnabled: slot.rainbowBorderEnabled,
    updatedAt: slot.updatedAt,
    destinationUrl: slot.destinationUrl,
    isPlaceholder: false
  }));
  const desktopHeroSlot = activeDesktopHeroBanner
    ? {
        id: activeDesktopHeroBanner.campaignId,
        label: "Banner exclusivo PC/Tablet",
        title: activeDesktopHeroBanner.campaignTitle,
        mediaUrl: activeDesktopHeroBanner.mediaUrl,
        imagePositionY: activeDesktopHeroBanner.bannerImagePositionY,
        imageZoom: activeDesktopHeroBanner.imageZoom,
        imagePositionX: activeDesktopHeroBanner.imagePositionX,
        rainbowBorderEnabled: activeDesktopHeroBanner.rainbowBorderEnabled,
        updatedAt: activeDesktopHeroBanner.updatedAt,
        destinationUrl: activeDesktopHeroBanner.destinationUrl,
        isPlaceholder: false
      }
    : null;

  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-5">
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)]">
            <div>
              <SearchPanel compact />
              <HomeCategoryActions />
              <Link href={"/procuro" as any} prefetch={false} className="mt-2 inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-[#22C55E] px-2 py-2 text-center text-[11px] font-black leading-tight text-black transition hover:bg-[#34D399] sm:mt-3 sm:px-3 sm:text-sm">
                <Search className="shrink-0" size={17} strokeWidth={2.8} />
                <span className="min-w-0">O QUE VOCÊ PROCURA</span>
              </Link>
            </div>
            <SponsoredDesktopHeroBanner slot={desktopHeroSlot} />
          </div>
        </div>
      </section>

      <SponsoredBannerCarousel slots={bannerSlots} />

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-3 pb-8 sm:gap-6 sm:px-4 sm:pb-10 lg:hidden">
        <MobileSection title="PRODUTOS" href="/produtos" listings={products} wantedRequests={[]} manualListings={productManualListings} empty="Nenhum Produto ativo encontrado." resetHref="/produtos" maxItems={3} />
        <MobileSection title="VEÍCULOS" href="/veiculos" listings={vehicles} wantedRequests={vehicleWantedRequests} manualListings={vehicleManualListings} empty="Nenhum Veículo ativo encontrado." resetHref="/veiculos" maxItems={3} />
        <MobileSection title="IMÓVEIS" href="/imoveis" listings={realEstate} wantedRequests={realEstateWantedRequests} manualListings={realEstateManualListings} empty="Nenhum Imóvel ativo encontrado." resetHref="/imoveis" maxItems={3} />
        <MobileProfessionalSection title="EMPRESAS / LOJAS" href={"/empresas" as Route} professionals={companyProfessionals} manualListings={companyManualListings} empty="Nenhuma Empresa ativa encontrada." />
        <MobileProfessionalSection title="SERVIÇOS" href="/servicos" professionals={serviceProfessionals} manualListings={onlyServiceManualListings} empty="Nenhum Serviço ativo encontrado." />
      </section>

      <section className="mx-auto hidden max-w-6xl grid-cols-5 gap-4 px-4 pb-10 lg:grid">
        <Section title="PRODUTOS" href="/produtos" listings={products} manualListings={productManualListings} empty="Nenhum Produto ativo encontrado." gridClassName="grid gap-4" />
        <Section title="VEÍCULOS" href="/veiculos" listings={vehicles} manualListings={vehicleManualListings} empty="Nenhum Veículo ativo encontrado." gridClassName="grid gap-4" />
        <Section title="IMÓVEIS" href="/imoveis" listings={realEstate} manualListings={realEstateManualListings} empty="Nenhum Imóvel ativo encontrado." gridClassName="grid gap-4" />
        <ProfessionalListSection title="SERVIÇOS" href="/servicos" professionals={serviceProfessionals.slice(0, 4)} manualListings={onlyServiceManualListings} empty="Nenhum Serviço ativo encontrado." />
        <ProfessionalListSection title="EMPRESAS / LOJAS" href={"/empresas" as Route} professionals={companyProfessionals.slice(0, 4)} manualListings={companyManualListings} empty="Nenhuma Empresa ativa encontrada." />
      </section>
    </main>
  );
}

function MobileSection({
  title,
  href,
  listings,
  wantedRequests,
  manualListings,
  empty,
  resetHref,
  maxItems
}: {
  title: string;
  href: Route;
  listings: any[];
  wantedRequests: Awaited<ReturnType<typeof findActiveWantedRequestsByContext>>;
  manualListings: ManualListing[];
  empty: string;
  resetHref: Route;
  maxItems?: number;
}) {
  const wantedCards = wantedRequests.map(toWantedCardItem);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <Link href={href} prefetch={false} className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-yellow-300/45 bg-yellow-300 px-3 text-center text-sm font-black text-black shadow-[0_0_18px_rgba(250,204,21,0.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200 sm:text-lg">{title}</Link>
      </div>
      {listings.length || wantedCards.length || manualListings.length ? (
        <HomeMobileListingGrid
          listings={JSON.parse(JSON.stringify(listings))}
          wantedRequests={wantedCards}
          manualListings={JSON.parse(JSON.stringify(manualListings))}
          emptyTitle={empty}
          resetHref={resetHref}
          maxItems={maxItems}
        />
      ) : (
        <EmptyState title={empty} description="Quando anúncios forem aprovados, eles aparecem automaticamente aqui." />
      )}
    </div>
  );
}

function MobileProfessionalSection({
  title,
  href,
  professionals,
  manualListings,
  empty
}: {
  title: string;
  href: Route;
  professionals: HomeProfessional[];
  manualListings: ManualListing[];
  empty: string;
}) {
  const cards = [];
  for (let index = 0; index < Math.max(professionals.length, manualListings.length); index += 1) {
    if (professionals[index]) cards.push(<ProfessionalCard key={professionals[index].id} professional={professionals[index]} />);
    if (manualListings[index]) cards.push(<ManualListingCard key={manualListings[index].id} listing={manualListings[index]} />);
  }
  const visibleCards = cards.slice(0, 3);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <Link href={href} prefetch={false} className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-yellow-300/45 bg-yellow-300 px-3 text-center text-sm font-black text-black shadow-[0_0_18px_rgba(250,204,21,0.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200 sm:text-lg">{title}</Link>
      </div>
      {visibleCards.length ? (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {visibleCards}
        </div>
      ) : (
        <EmptyState title={empty} description="Quando anúncios forem aprovados, eles aparecem automaticamente aqui." />
      )}
    </div>
  );
}

function Section({ title, href, listings, manualListings, empty, gridClassName = "grid gap-3 sm:grid-cols-2 sm:gap-4" }: { title: string; href: Route; listings: any[]; manualListings: ManualListing[]; empty: string; gridClassName?: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <CategorySectionButton title={title} href={href} />
      </div>
      {listings.length || manualListings.length ? (
        <HomeMobileListingGrid
          listings={JSON.parse(JSON.stringify(listings))}
          wantedRequests={[]}
          manualListings={JSON.parse(JSON.stringify(manualListings))}
          emptyTitle={empty}
          resetHref={href}
          gridClassName={gridClassName}
        />
      ) : (
        <EmptyState title={empty} description="Quando anúncios forem aprovados, eles aparecem automaticamente aqui." />
      )}
    </div>
  );
}

function ProfessionalListSection({ title, href, professionals, manualListings, empty }: { title: string; href: Route; professionals: HomeProfessional[]; manualListings: ManualListing[]; empty: string }) {
  const cards = [];
  for (let index = 0; index < Math.max(professionals.length, manualListings.length); index += 1) {
    if (professionals[index]) cards.push(<ProfessionalCard key={professionals[index].id} professional={professionals[index]} />);
    if (manualListings[index]) cards.push(<ManualListingCard key={manualListings[index].id} listing={manualListings[index]} />);
  }
  return (
    <div className="min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <CategorySectionButton title={title} href={href} />
      </div>
      {cards.length ? (
        <div className="grid gap-4">
          {cards.slice(0, 4)}
        </div>
      ) : (
        <EmptyState title={empty} description="Quando anúncios forem aprovados, eles aparecem automaticamente aqui." />
      )}
    </div>
  );
}

function CategorySectionButton({ title, href }: { title: string; href: Route }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-yellow-300/45 bg-yellow-300 px-3 text-center text-sm font-black text-black shadow-[0_0_18px_rgba(250,204,21,0.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200 sm:text-lg">
      {title}
    </Link>
  );
}

function toWantedCardItem(request: Awaited<ReturnType<typeof findActiveWantedRequests>>[number]) {
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

function ProfessionalCard({ professional }: { professional: HomeProfessional }) {
  return (
    <div className="rounded-3xl bg-[#A855F7] p-[2px] shadow-[0_0_22px_rgba(168,85,247,0.22)] transition hover:-translate-y-0.5">
      <Link
        href={`/servicos/${professional.id}`}
        className="group block overflow-hidden rounded-[1.35rem] bg-[linear-gradient(145deg,#151515_0%,#090909_58%,#101f16_100%)] shadow-2xl shadow-black/30"
      >
        <div className="relative aspect-[4/3] bg-neutral-900">
          {professional.imageUrl ? (
            <img src={professional.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,#14532d_0%,#050505_58%)]">
              <span className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-400 text-black shadow-[0_0_30px_rgba(52,211,153,0.25)]">
                <Wrench size={42} strokeWidth={2.5} />
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase text-emerald-300 backdrop-blur">
            {professional.isPro ? "PRO" : "Profissional"}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-base font-black leading-snug text-white">{professional.companyName ?? professional.title}</h3>
          <p className="line-clamp-1 text-xs font-black uppercase text-emerald-300">{professional.categories.slice(0, 2).join(" · ")}</p>
          <p className="line-clamp-2 text-sm text-neutral-300">{professional.areaText}</p>
        </div>
      </Link>
    </div>
  );
}

type HomeProfessional = {
  id: string;
  type: string;
  title: string;
  companyName: string | null;
  categories: string[];
  imageUrl: string | null;
  areaText: string;
  isPro: boolean;
};

type ServiceProfileRow = {
  id: string;
  tipo_cadastro: string;
  categoria_servico: string;
  categorias_servico: string[] | null;
  name: string | null;
  nome_fantasia: string | null;
  cidade: string | null;
  estado: string | null;
  foto_perfil: string | null;
  logo_empresa: string | null;
  complemento: string | null;
};

async function findHomeProfessionals(limit: number): Promise<HomeProfessional[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("service_profiles")
    .select("id,categoria_servico,categorias_servico,name,nome_fantasia,cidade,estado,foto_perfil,logo_empresa,complemento")
    .eq("active", true)
    .in("status", ["ACTIVE", "INACTIVE"])
    .order("score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(Math.max(limit * 2, limit));

  if (error) throw error;

  return ((data ?? []) as ServiceProfileRow[])
    .filter((profile) => isServiceVisibleByBilling(profile.complemento))
    .slice(0, limit)
    .map((profile) => {
      const complement = parseServiceComplement(profile.complemento);
      const serviceImages = Array.isArray(complement.serviceImages)
        ? complement.serviceImages.filter((item: unknown): item is string => typeof item === "string" && /^https?:\/\//.test(item))
        : [];
      const categories = Array.isArray(profile.categorias_servico) && profile.categorias_servico.length
        ? profile.categorias_servico
        : [profile.categoria_servico].filter(Boolean);

      return {
        id: profile.id,
        type: profile.tipo_cadastro,
        title: profile.name || profile.nome_fantasia || profile.categoria_servico || "Profissional Achei X",
        companyName: profile.nome_fantasia,
        categories,
        imageUrl: serviceImages[0] ?? profile.logo_empresa ?? profile.foto_perfil ?? null,
        areaText: publicServiceAreaText(publicServiceAreas(profile.cidade, profile.estado, profile.complemento)),
        isPro: isPaidServicePlanCode(parseServiceBillingPlan(profile.complemento))
      };
    });
}

function parseServiceBillingPlan(complement: string | null) {
  const parsed = parseServiceComplement(complement);
  return typeof parsed.serviceBilling?.planCode === "string" ? parsed.serviceBilling.planCode : null;
}

