import { ListingResults } from "@/components/listing-results";
import { SearchPanel } from "@/components/search-panel";
import type { ListingSearchParams } from "@/lib/listing-search";
import type { LucideIcon } from "lucide-react";
import { BadgeDollarSign, CalendarDays, Home, KeyRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function RealEstatePage({ searchParams }: { searchParams: ListingSearchParams }) {
  const activePurpose = normalizePurpose(searchParams.purpose);
  const priceBands = activePurpose === "Venda" ? salePriceBands : rentPriceBands;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-yellow-300">Imóveis</p>
        <h1 className="mt-2 text-3xl font-black">Casa, Apto, Terreno e Locação</h1>
      </div>

      <SearchPanel
        q={searchParams.q}
        category="REAL_ESTATE"
        min={searchParams.min}
        max={searchParams.max}
        sort={searchParams.sort}
        purpose={searchParams.purpose}
        action="/imoveis"
        fixedCategory="REAL_ESTATE"
      />

      <section className="mt-4 rounded-3xl border border-white/10 bg-neutral-950/80 p-3 shadow-[0_0_35px_rgba(0,0,0,0.35)] sm:p-4">
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

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-emerald-300">Busca por Valor</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
              {activePurpose === "Venda" ? "Compra com filtro rápido" : activePurpose === "Temporada" ? "Temporada que cabe no bolso" : "Aluguel que cabe no bolso"}
            </h2>
          </div>
          <Home className="hidden shrink-0 text-emerald-300 sm:block" size={34} strokeWidth={2.4} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {priceBands.map((band) => (
            <Link
              key={`${band.label}-${band.value}`}
              href={quickFilterHref(searchParams, { purpose: activePurpose, min: band.min ?? "", max: band.max ?? "" })}
              prefetch={false}
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
      </section>

      <section className="mt-6">
        <ListingResults searchParams={searchParams} category="REAL_ESTATE" emptyTitle="Nenhum Imóvel ativo encontrado." />
      </section>
    </main>
  );
}

type PurposeValue = "Venda" | "Locação" | "Temporada";
type PurposeOption = { value: PurposeValue; label: string; helper: string; icon: LucideIcon };
type PriceBand = { label: string; value: string; min?: string; max?: string };

const purposeOptions: PurposeOption[] = [
  { value: "Venda", label: "Venda", helper: "Comprar imóvel", icon: BadgeDollarSign },
  { value: "Locação", label: "Locação", helper: "Alugar para morar", icon: KeyRound },
  { value: "Temporada", label: "Temporada", helper: "Praia e estadias rápidas", icon: CalendarDays }
];

const rentPriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 1.000", max: "1000" },
  { label: "Até", value: "R$ 2.000", max: "2000" },
  { label: "Até", value: "R$ 3.000", max: "3000" },
  { label: "Até", value: "R$ 5.000", max: "5000" },
  { label: "Até", value: "R$ 8.000", max: "8000" },
  { label: "A partir de", value: "R$ 8.000", min: "8000" }
];

const salePriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 150 mil", max: "150000" },
  { label: "Até", value: "R$ 300 mil", max: "300000" },
  { label: "Até", value: "R$ 500 mil", max: "500000" },
  { label: "Até", value: "R$ 800 mil", max: "800000" },
  { label: "Até", value: "R$ 1,2 mi", max: "1200000" },
  { label: "A partir de", value: "R$ 1,2 mi", min: "1200000" }
];

function QuickPurposeButton({ option, active, href }: { option: PurposeOption; active: boolean; href: Route }) {
  const Icon = option.icon;
  return (
    <Link
      href={href}
      prefetch={false}
      className={`grid min-h-[94px] place-items-center rounded-2xl border px-2 py-3 text-center transition hover:-translate-y-0.5 ${
        active
          ? "border-emerald-300 bg-emerald-400 text-black shadow-[0_0_24px_rgba(52,211,153,0.28)]"
          : "border-white/12 bg-black/60 text-white hover:border-emerald-300/55"
      }`}
    >
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-black/15" : "bg-emerald-400/15 text-emerald-300"}`}>
        <Icon size={25} strokeWidth={2.6} />
      </span>
      <span className="mt-2 block text-sm font-black uppercase leading-tight sm:text-base">{option.label}</span>
      <span className={`mt-0.5 block text-[11px] font-bold leading-tight ${active ? "text-black/70" : "text-neutral-400"}`}>{option.helper}</span>
    </Link>
  );
}

function normalizePurpose(value?: string): PurposeValue {
  if (value === "Venda" || value === "Temporada") return value;
  return "Locação";
}

function quickFilterHref(searchParams: ListingSearchParams, patch: Partial<Record<"purpose" | "min" | "max", string>>): Route {
  const params = new URLSearchParams();
  const keepKeys: Array<keyof ListingSearchParams> = ["q", "type", "state", "city", "district", "sort"];
  for (const key of keepKeys) {
    const value = searchParams[key];
    if (typeof value === "string" && value.trim()) params.set(key, value);
  }
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
