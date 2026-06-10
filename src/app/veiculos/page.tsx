import { ListingResults } from "@/components/listing-results";
import { SearchPanel } from "@/components/search-panel";
import { ELECTRIC_OR_HYBRID_FUEL_FILTER, type ListingSearchParams } from "@/lib/listing-search";
import type { LucideIcon } from "lucide-react";
import { Bike, BusFront, CarFront, Package, ShipWheel, Truck, Zap } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function VehiclesPage({ searchParams }: { searchParams: ListingSearchParams }) {
  const activeType = normalizeVehicleType(searchParams.type);
  const electricHybridActive = isElectricHybridFuel(searchParams.fuel);
  const priceBands = priceBandsFor(activeType);
  const brands = brandsFor(activeType);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-yellow-300">Veículos</p>
        <h1 className="mt-2 text-3xl font-black">Carro, Moto, Bicicleta e mais</h1>
      </div>

      <SearchPanel
        q={searchParams.q}
        category="VEHICLE"
        type={searchParams.type}
        brand={searchParams.brand}
        fuel={searchParams.fuel}
        min={searchParams.min}
        max={searchParams.max}
        sort={searchParams.sort}
        action="/veiculos"
        fixedCategory="VEHICLE"
      />

      <section className="mt-4 rounded-3xl border border-white/10 bg-neutral-950/80 p-3 shadow-[0_0_35px_rgba(0,0,0,0.35)] sm:p-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {vehicleTypeOptions.map((option) => (
            <VehicleTypeButton
              key={option.label}
              option={option}
              active={option.value === null ? !activeType && !electricHybridActive : activeType === option.value}
              href={quickVehicleHref(searchParams, { type: option.value ?? "", brand: "", min: "", max: "" })}
            />
          ))}
          <VehicleTypeButton
            option={{ value: null, label: "Elétricos e Híbridos", icon: Zap }}
            active={electricHybridActive}
            href={quickVehicleHref(searchParams, { fuel: electricHybridActive ? "" : ELECTRIC_OR_HYBRID_FUEL_FILTER, min: "", max: "" })}
          />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-emerald-300">Faixas de Preço</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{priceTitle(activeType)}</h2>
          </div>
          {activeType || electricHybridActive ? (
            <Link href={quickVehicleHref(searchParams, { type: "", brand: "", fuel: "", min: "", max: "" })} prefetch={false} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/10">
              Ver geral
            </Link>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {priceBands.map((band) => (
            <Link
              key={`${band.label}-${band.value}`}
              href={quickVehicleHref(searchParams, { type: activeType ?? "", min: band.min ?? "", max: band.max ?? "" })}
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

        <div className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-emerald-300">Filtro por Marca</p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{brandTitle(activeType)}</h2>
            </div>
            {searchParams.brand ? (
              <Link href={quickVehicleHref(searchParams, { brand: "", min: "", max: "" })} prefetch={false} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/10">
                Limpar marca
              </Link>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={`${brand.name}-${brand.type ?? "all"}`}
                href={quickVehicleHref(searchParams, { type: brand.type ?? activeType ?? "", brand: brand.name, min: "", max: "" })}
                prefetch={false}
                className={`grid min-h-[88px] place-items-center rounded-2xl border px-3 py-3 text-center transition hover:-translate-y-0.5 ${
                  searchParams.brand === brand.name
                    ? "border-emerald-300 bg-emerald-400 text-black shadow-[0_0_22px_rgba(52,211,153,0.25)]"
                    : "border-white/12 bg-black/55 text-white hover:border-emerald-300/55"
                }`}
              >
                <span className="grid h-9 w-full place-items-center">
                  <img src={`https://cdn.simpleicons.org/${brand.iconSlug}/22C55E`} alt="" loading="lazy" className="max-h-8 max-w-[86px] object-contain" />
                </span>
                <strong className="mt-2 block text-sm font-black uppercase leading-tight">{brand.name}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <ListingResults searchParams={searchParams} category="VEHICLE" emptyTitle="Nenhum Veículo ativo encontrado." />
      </section>
    </main>
  );
}

type VehicleTypeValue = "Carro" | "Moto" | "Bicicleta Elétrica" | "Bicicleta de Pedal" | "Utilitário" | "Ônibus" | "Caminhão" | "Van" | "Embarcação";
type VehicleTypeOption = { value: VehicleTypeValue | null; label: string; icon: LucideIcon };
type PriceBand = { label: string; value: string; min?: string; max?: string };
type BrandOption = { name: string; iconSlug: string; type?: VehicleTypeValue };

const vehicleTypeOptions: VehicleTypeOption[] = [
  { value: null, label: "Todos", icon: Package },
  { value: "Carro", label: "Carro", icon: CarFront },
  { value: "Moto", label: "Moto", icon: Bike },
  { value: "Bicicleta Elétrica", label: "Bike Elétrica", icon: Zap },
  { value: "Bicicleta de Pedal", label: "Bike Pedal", icon: Bike },
  { value: "Utilitário", label: "Utilitários", icon: Truck },
  { value: "Ônibus", label: "Ônibus", icon: BusFront },
  { value: "Caminhão", label: "Caminhão", icon: Truck },
  { value: "Embarcação", label: "Embarcação", icon: ShipWheel }
];

const carPriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 30 mil", max: "3000000" },
  { label: "Até", value: "R$ 50 mil", max: "5000000" },
  { label: "Até", value: "R$ 70 mil", max: "7000000" },
  { label: "Até", value: "R$ 100 mil", max: "10000000" },
  { label: "Até", value: "R$ 150 mil", max: "15000000" },
  { label: "A partir de", value: "R$ 150 mil", min: "15000000" }
];

const motorcyclePriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 10 mil", max: "1000000" },
  { label: "Até", value: "R$ 20 mil", max: "2000000" },
  { label: "Até", value: "R$ 35 mil", max: "3500000" },
  { label: "Até", value: "R$ 50 mil", max: "5000000" },
  { label: "Até", value: "R$ 80 mil", max: "8000000" },
  { label: "A partir de", value: "R$ 80 mil", min: "8000000" }
];

const electricBikePriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 2 mil", max: "200000" },
  { label: "Até", value: "R$ 4 mil", max: "400000" },
  { label: "Até", value: "R$ 7 mil", max: "700000" },
  { label: "Até", value: "R$ 10 mil", max: "1000000" },
  { label: "Até", value: "R$ 15 mil", max: "1500000" },
  { label: "A partir de", value: "R$ 15 mil", min: "1500000" }
];

const pedalBikePriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 500", max: "50000" },
  { label: "Até", value: "R$ 1 mil", max: "100000" },
  { label: "Até", value: "R$ 2 mil", max: "200000" },
  { label: "Até", value: "R$ 4 mil", max: "400000" },
  { label: "Até", value: "R$ 8 mil", max: "800000" },
  { label: "A partir de", value: "R$ 8 mil", min: "800000" }
];

const heavyVehiclePriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 100 mil", max: "10000000" },
  { label: "Até", value: "R$ 200 mil", max: "20000000" },
  { label: "Até", value: "R$ 350 mil", max: "35000000" },
  { label: "Até", value: "R$ 500 mil", max: "50000000" },
  { label: "Até", value: "R$ 800 mil", max: "80000000" },
  { label: "A partir de", value: "R$ 800 mil", min: "80000000" }
];

const boatPriceBands: PriceBand[] = [
  { label: "Até", value: "R$ 50 mil", max: "5000000" },
  { label: "Até", value: "R$ 100 mil", max: "10000000" },
  { label: "Até", value: "R$ 200 mil", max: "20000000" },
  { label: "Até", value: "R$ 400 mil", max: "40000000" },
  { label: "Até", value: "R$ 800 mil", max: "80000000" },
  { label: "A partir de", value: "R$ 800 mil", min: "80000000" }
];

const carBrands: BrandOption[] = [
  { name: "Chevrolet", iconSlug: "chevrolet", type: "Carro" },
  { name: "Fiat", iconSlug: "fiat", type: "Carro" },
  { name: "Ford", iconSlug: "ford", type: "Carro" },
  { name: "Honda", iconSlug: "honda", type: "Carro" },
  { name: "Hyundai", iconSlug: "hyundai", type: "Carro" },
  { name: "Jeep", iconSlug: "jeep", type: "Carro" },
  { name: "Nissan", iconSlug: "nissan", type: "Carro" },
  { name: "Renault", iconSlug: "renault", type: "Carro" },
  { name: "Toyota", iconSlug: "toyota", type: "Carro" },
  { name: "Volkswagen", iconSlug: "volkswagen", type: "Carro" }
];

const motorcycleBrands: BrandOption[] = [
  { name: "BMW", iconSlug: "bmw", type: "Moto" },
  { name: "Ducati", iconSlug: "ducati", type: "Moto" },
  { name: "Harley-Davidson", iconSlug: "harleydavidson", type: "Moto" },
  { name: "Honda", iconSlug: "honda", type: "Moto" },
  { name: "Kawasaki", iconSlug: "kawasaki", type: "Moto" },
  { name: "KTM", iconSlug: "ktm", type: "Moto" },
  { name: "Suzuki", iconSlug: "suzuki", type: "Moto" },
  { name: "Triumph", iconSlug: "triumph", type: "Moto" },
  { name: "Yamaha", iconSlug: "yamaha", type: "Moto" }
];

const bicycleBrands: BrandOption[] = [
  { name: "Caloi", iconSlug: "bicycle", type: "Bicicleta de Pedal" },
  { name: "Sense", iconSlug: "bicycle", type: "Bicicleta de Pedal" },
  { name: "Oggi", iconSlug: "bicycle", type: "Bicicleta de Pedal" },
  { name: "Specialized", iconSlug: "specialized", type: "Bicicleta de Pedal" },
  { name: "Trek", iconSlug: "trek", type: "Bicicleta de Pedal" },
  { name: "Cannondale", iconSlug: "cannondale", type: "Bicicleta de Pedal" },
  { name: "Lev", iconSlug: "bicycle", type: "Bicicleta Elétrica" },
  { name: "Duos", iconSlug: "bicycle", type: "Bicicleta Elétrica" },
  { name: "Machine Motors", iconSlug: "bicycle", type: "Bicicleta Elétrica" },
  { name: "Two Dogs", iconSlug: "bicycle", type: "Bicicleta Elétrica" }
];

const heavyBrands: BrandOption[] = [
  { name: "Mercedes-Benz", iconSlug: "mercedesbenz" },
  { name: "Scania", iconSlug: "scania" },
  { name: "Volkswagen", iconSlug: "volkswagen" },
  { name: "Volvo", iconSlug: "volvo" },
  { name: "Iveco", iconSlug: "iveco" },
  { name: "MAN", iconSlug: "man" }
];

function VehicleTypeButton({ option, active, href }: { option: VehicleTypeOption; active: boolean; href: Route }) {
  const Icon = option.icon;
  return (
    <Link
      href={href}
      prefetch={false}
      className={`grid min-h-[90px] place-items-center rounded-2xl border px-2 py-3 text-center transition hover:-translate-y-0.5 ${
        active
          ? "border-emerald-300 bg-emerald-400 text-black shadow-[0_0_24px_rgba(52,211,153,0.28)]"
          : "border-white/12 bg-black/60 text-white hover:border-emerald-300/55"
      }`}
    >
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-black/15" : "bg-emerald-400/15 text-emerald-300"}`}>
        <Icon size={25} strokeWidth={2.6} />
      </span>
      <span className="mt-2 block text-xs font-black uppercase leading-tight sm:text-sm">{option.label}</span>
    </Link>
  );
}

function normalizeVehicleType(value?: string): VehicleTypeValue | null {
  return vehicleTypeOptions.find((option) => option.value === value)?.value ?? null;
}

function isElectricHybridFuel(value?: string) {
  if (!value) return false;
  return value === ELECTRIC_OR_HYBRID_FUEL_FILTER || value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("eletrico/hibrido");
}

function priceBandsFor(type: VehicleTypeValue | null) {
  if (type === "Moto") return motorcyclePriceBands;
  if (type === "Bicicleta Elétrica") return electricBikePriceBands;
  if (type === "Bicicleta de Pedal") return pedalBikePriceBands;
  if (type === "Caminhão" || type === "Ônibus") return heavyVehiclePriceBands;
  if (type === "Embarcação") return boatPriceBands;
  return carPriceBands;
}

function brandsFor(type: VehicleTypeValue | null) {
  if (type === "Moto") return motorcycleBrands;
  if (type === "Bicicleta Elétrica") return bicycleBrands.filter((brand) => brand.type === "Bicicleta Elétrica");
  if (type === "Bicicleta de Pedal") return bicycleBrands.filter((brand) => brand.type === "Bicicleta de Pedal");
  if (type === "Caminhão" || type === "Ônibus") return heavyBrands;
  if (type === "Carro" || type === "Utilitário" || type === "Van") return carBrands;
  return [...carBrands, ...motorcycleBrands, ...bicycleBrands].slice(0, 18);
}

function priceTitle(type: VehicleTypeValue | null) {
  if (type === "Moto") return "Faixas de preço de motos";
  if (type === "Bicicleta Elétrica") return "Faixas de preço de bikes elétricas";
  if (type === "Bicicleta de Pedal") return "Faixas de preço de bikes de pedal";
  if (type === "Caminhão") return "Faixas de preço de caminhões";
  if (type === "Ônibus") return "Faixas de preço de ônibus";
  if (type === "Embarcação") return "Faixas de preço de embarcações";
  if (type === "Utilitário" || type === "Van") return "Faixas de preço de utilitários";
  if (type === "Carro") return "Faixas de preço de carros";
  return "Faixas de preço gerais";
}

function brandTitle(type: VehicleTypeValue | null) {
  if (type === "Moto") return "Marcas de moto";
  if (type === "Bicicleta Elétrica") return "Marcas de bike elétrica";
  if (type === "Bicicleta de Pedal") return "Marcas de bike de pedal";
  if (type === "Caminhão" || type === "Ônibus") return "Marcas de pesados";
  if (type === "Carro" || type === "Utilitário" || type === "Van") return "Marcas de carro";
  return "Marcas populares";
}

function quickVehicleHref(searchParams: ListingSearchParams, patch: Partial<Record<"type" | "brand" | "fuel" | "min" | "max", string>>): Route {
  const params = new URLSearchParams();
  const keepKeys: Array<keyof ListingSearchParams> = ["q", "state", "city", "district", "sort", "model", "minYear", "maxYear", "maxMileageKm"];
  for (const key of keepKeys) {
    const value = searchParams[key];
    if (typeof value === "string" && value.trim()) params.set(key, value);
  }
  if (typeof searchParams.type === "string" && searchParams.type.trim()) params.set("type", searchParams.type);
  if (typeof searchParams.brand === "string" && searchParams.brand.trim()) params.set("brand", searchParams.brand);
  if (typeof searchParams.fuel === "string" && searchParams.fuel.trim()) params.set("fuel", searchParams.fuel);
  if (typeof searchParams.min === "string" && searchParams.min.trim()) params.set("min", searchParams.min);
  if (typeof searchParams.max === "string" && searchParams.max.trim()) params.set("max", searchParams.max);
  params.set("category", "VEHICLE");
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return (query ? `/veiculos?${query}` : "/veiculos") as Route;
}

function isActiveBand(searchParams: ListingSearchParams, band: PriceBand) {
  return (band.min ? searchParams.min === band.min : !searchParams.min) && (band.max ? searchParams.max === band.max : !searchParams.max);
}
