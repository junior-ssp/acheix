import { ListingResults } from "@/components/listing-results";
import { SearchResultModal } from "@/components/search-result-modal";
import { SearchPanel } from "@/components/search-panel";
import { findActiveListings, type ListingSearchParams } from "@/lib/listing-search";
import { WantedRequestSection } from "@/components/wanted-request-section";
import { findActiveWantedRequestsByContext } from "@/lib/wanted-requests";
import { findActiveManualListings } from "@/lib/manual-listings";
import type { LucideIcon } from "lucide-react";
import { BadgeDollarSign, CalendarDays, Home, KeyRound, Pencil, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { normalizeRealEstatePurpose, realEstatePurposeLabels, type RealEstatePurpose } from "@/lib/real-estate-taxonomy";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }: { searchParams: ListingSearchParams }): Metadata {
  const purpose = normalizeRealEstatePurpose(searchParams.purpose);
  const type = String(searchParams.type ?? "").trim();
  if (!purpose || !type) return { title: "Imóveis | Achei X" };
  const label = realEstatePurposeLabels[purpose];
  return { title: `${type} para ${label} | Achei X`, description: `Encontre ${type.toLowerCase()} para ${label.toLowerCase()} no Achei X.` };
}

export default async function RealEstatePage({ searchParams }: { searchParams: ListingSearchParams & { modo?: string } }) {
  const activePurpose = normalizePurpose(searchParams.purpose);
  const priceBands = activePurpose === "SALE" ? salePriceBands : rentPriceBands;
  const hasSubmittedSearch = searchParams.searched === "1";
  const showSearchTools = searchParams.modo === "buscar" || hasSubmittedSearch;
  const [filteredListings, wantedRequests, manualListings] = await Promise.all([
    hasSubmittedSearch ? findActiveListings(searchParams, "REAL_ESTATE") : Promise.resolve(undefined),
    searchParams.q ? findActiveWantedRequestsByContext({ q: searchParams.q, context: "REAL_ESTATE", limit: 6 }) : Promise.resolve([]),
    findActiveManualListings({ categories: ["REAL_ESTATE"], limit: 12 })
  ]);
  const resultCount = filteredListings?.length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-yellow-300">Imóveis</p>
        <h1 className="mt-2 text-3xl font-black">Casa, Apto, Terreno e Locação</h1>
      </div>

      <CategoryActionButtons searchHref="/imoveis?modo=buscar" announceHref="/anunciar?category=REAL_ESTATE" searchLabel="Buscar Imóveis" announceLabel="Anunciar Imóveis" />

      {showSearchTools ? <div className="mt-5">
        <SearchPanel
          q={searchParams.q}
          category="REAL_ESTATE"
          type={searchParams.type}
          min={searchParams.min}
          max={searchParams.max}
          sort={searchParams.sort}
          purpose={searchParams.purpose}
          action="/imoveis"
          fixedCategory="REAL_ESTATE"
        />
      </div> : null}

      {hasSubmittedSearch ? (
        <SearchResultModal
          count={resultCount}
          labelSingular="imóvel"
          labelPlural="imóveis"
          emptyMessage="Nenhum imóvel encontrado com esses filtros."
          resetHref="/imoveis"
          resultMode="scroll"
        />
      ) : null}


      {showSearchTools ? <section className="mt-4 rounded-3xl border border-white/10 bg-neutral-950/80 p-3 shadow-[0_0_35px_rgba(0,0,0,0.35)] sm:p-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {purposeOptions.map((option) => (
            <QuickPurposeButton
              key={option.value}
              option={option}
              active={activePurpose === option.value}
              href={quickFilterHref(searchParams, { purpose: option.value, min: "", max: "" })}
            />
          ))}
        </div>
        <Link href={quickFilterHref(searchParams, { searched: "1" })} className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-black btn-gold">
          Buscar
        </Link>
      </section> : null}

      {showSearchTools ? <section className="mt-4 rounded-3xl border border-white/10 bg-neutral-950/80 p-3 shadow-[0_0_35px_rgba(0,0,0,0.35)] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-black uppercase text-emerald-300 sm:text-xl">Busca por Valor</p>
          </div>
          <Home className="hidden shrink-0 text-emerald-300 sm:block" size={34} strokeWidth={2.4} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {priceBands.map((band) => (
            <Link
              key={`${band.label}-${band.value}`}
              href={quickFilterHref(searchParams, { purpose: activePurpose, min: band.min ?? "", max: band.max ?? "" })}
              scroll={false}
              className={`min-h-[76px] rounded-2xl border px-3 py-3 text-center transition hover:-translate-y-0.5 ${
                isActiveBand(searchParams, band)
                  ? "border-emerald-300 bg-emerald-400 text-black shadow-[0_0_22px_rgba(52,211,153,0.25)]"
                  : "border-white/12 bg-black/55 text-white hover:border-emerald-300/55"
              }`}
            >
              <span className="block text-sm font-bold leading-tight opacity-80">{band.label}</span>
              <strong className="mt-1 block text-lg font-black leading-tight sm:text-xl">{band.value}</strong>
            </Link>
          ))}
        </div>
        <Link href={quickFilterHref(searchParams, { searched: "1" })} className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-black btn-gold">
          Buscar
        </Link>
      </section> : null}

      {filteredListings ? (
        <section id="resultados-abertos" className="mt-6 scroll-mt-24">
          <WantedRequestSection
            title="Procura-se em imóveis"
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
          {wantedRequests.length ? <div className="h-6" /> : null}
          <ListingResults searchParams={searchParams} category="REAL_ESTATE" emptyTitle="Nenhum Imóvel ativo encontrado." listings={filteredListings} manualListings={manualListings} />
        </section>
      ) : (
        <section id="resultados-anuncios" className="mt-6 scroll-mt-24">
          <WantedRequestSection
            title="Procura-se em imóveis"
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
          {wantedRequests.length ? <div className="h-6" /> : null}
          <ListingResults searchParams={searchParams} category="REAL_ESTATE" emptyTitle="Nenhum Imóvel ativo encontrado." manualListings={manualListings} />
        </section>
      )}
    </main>
  );
}

type PurposeValue = RealEstatePurpose;
type PurposeOption = { value: PurposeValue; label: string; helper: string; icon: LucideIcon };
type PriceBand = { label: string; value: string; min?: string; max?: string };

const purposeOptions: PurposeOption[] = [
  { value: "SALE", label: realEstatePurposeLabels.SALE, helper: "Comprar imóvel", icon: BadgeDollarSign },
  { value: "RENT", label: realEstatePurposeLabels.RENT, helper: "Alugar para morar", icon: KeyRound },
  { value: "SEASON", label: realEstatePurposeLabels.SEASON, helper: "Praia e estadias rápidas", icon: CalendarDays }
];

const rentPriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 1.000", max: "100000" },
  { label: "Até", value: "R$ 2.000", max: "200000" },
  { label: "Até", value: "R$ 3.000", max: "300000" },
  { label: "Até", value: "R$ 5.000", max: "500000" },
  { label: "Até", value: "R$ 8.000", max: "800000" },
  { label: "A partir de", value: "R$ 8.000", min: "800000" }
];

const salePriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 150 mil", max: "15000000" },
  { label: "Até", value: "R$ 300 mil", max: "30000000" },
  { label: "Até", value: "R$ 500 mil", max: "50000000" },
  { label: "Até", value: "R$ 800 mil", max: "80000000" },
  { label: "Até", value: "R$ 1,2 mi", max: "120000000" },
  { label: "A partir de", value: "R$ 1,2 mi", min: "120000000" }
];

function QuickPurposeButton({ option, active, href }: { option: PurposeOption; active: boolean; href: Route }) {
  const Icon = option.icon;
  return (
    <Link
      href={href}
      className={`grid min-h-[78px] place-items-center rounded-2xl border px-2 py-2.5 text-center transition hover:-translate-y-0.5 sm:min-h-[94px] sm:py-3 ${
        active
          ? "border-emerald-300 bg-emerald-400 text-black shadow-[0_0_24px_rgba(52,211,153,0.28)]"
          : "border-white/12 bg-black/60 text-white hover:border-emerald-300/55"
      }`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${active ? "bg-black/15" : "bg-emerald-400/15 text-emerald-300"}`}>
        <Icon size={25} strokeWidth={2.6} />
      </span>
      <span className="mt-1.5 block text-xs font-black uppercase leading-tight sm:mt-2 sm:text-base">{option.label}</span>
      <span className={`mt-0.5 hidden text-[11px] font-bold leading-tight sm:block ${active ? "text-black/70" : "text-neutral-400"}`}>{option.helper}</span>
    </Link>
  );
}

function normalizePurpose(value?: string): PurposeValue {
  return normalizeRealEstatePurpose(value) ?? "RENT";
}

function quickFilterHref(searchParams: ListingSearchParams, patch: Partial<Record<"purpose" | "min" | "max" | "searched", string>>): Route {
  const params = new URLSearchParams();
  const keepKeys: Array<keyof ListingSearchParams> = ["q", "type", "state", "city", "district", "sort"];
  for (const key of keepKeys) {
    const value = searchParams[key];
    if (typeof value === "string" && value.trim()) params.set(key, value);
  }
  if (typeof searchParams.purpose === "string" && searchParams.purpose.trim()) params.set("purpose", searchParams.purpose);
  if (typeof searchParams.min === "string" && searchParams.min.trim()) params.set("min", searchParams.min);
  if (typeof searchParams.max === "string" && searchParams.max.trim()) params.set("max", searchParams.max);
  params.set("modo", "buscar");
  params.set("category", "REAL_ESTATE");
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return (query ? `/imoveis?${query}` : "/imoveis") as Route;
}

function isActiveBand(searchParams: ListingSearchParams, band: PriceBand) {
  return (band.min ? searchParams.min === band.min : !searchParams.min) && (band.max ? searchParams.max === band.max : !searchParams.max);
}

function CategoryActionButtons({ searchHref, announceHref, searchLabel, announceLabel }: { searchHref: Route | string; announceHref: Route | string; searchLabel: string; announceLabel: string }) {
  return (
    <section className="grid gap-3 rounded-3xl border border-yellow-300/25 bg-neutral-950/80 p-3 shadow-[0_0_30px_rgba(250,204,21,0.12)] sm:grid-cols-2 sm:p-4">
      <Link href={searchHref as Route} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#22C55E] px-4 text-center text-sm font-black uppercase text-black shadow-[0_0_18px_rgba(34,197,94,0.22)] transition hover:-translate-y-0.5 hover:bg-[#34D399]">
        <Search size={20} strokeWidth={2.8} />
        {searchLabel}
      </Link>
      <Link href={announceHref as Route} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 text-center text-sm font-black uppercase text-black shadow-[0_0_18px_rgba(250,204,21,0.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
        <Pencil size={20} strokeWidth={2.8} />
        {announceLabel}
      </Link>
    </section>
  );
}
