import { Search, SlidersHorizontal } from "lucide-react";
import { categories } from "@/lib/constants";
import { CurrencyInput } from "@/components/currency-input";
import { IntegerInput } from "@/components/integer-input";
import { LocationFields } from "@/components/location-fields";

const SEARCH_PLACEHOLDER = "O que você procura?";

type SearchPanelProps = {
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  sort?: string;
  action?: string;
  fixedCategory?: "VEHICLE" | "REAL_ESTATE";
  compact?: boolean;
};

export function SearchPanel({ q, category, min, max, sort, action = "/buscar", fixedCategory, compact }: SearchPanelProps) {
  const currentCategory = fixedCategory ?? category;

  if (compact) {
    return (
      <form action={action} className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input
            name="q"
            defaultValue={q}
            placeholder={SEARCH_PLACEHOLDER}
            className="h-11 w-full rounded-full border border-white/10 bg-black/70 pl-9 pr-3 text-sm font-bold text-white outline-none focus:border-brand sm:h-12 sm:pl-10 sm:text-base"
          />
        </label>
        <button className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-xs btn-gold sm:h-12 sm:min-w-32 sm:px-5 sm:text-base">
          Buscar
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="glass-panel rounded-2xl p-2.5 sm:rounded-3xl sm:p-3">
      <div className="grid gap-2 sm:gap-3 md:grid-cols-[1fr_180px_160px_120px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input
            name="q"
            defaultValue={q}
            placeholder={SEARCH_PLACEHOLDER}
            className="h-11 w-full rounded-full border border-white/10 bg-black/70 pl-9 pr-3 text-sm font-bold text-white outline-none focus:border-brand sm:h-12 sm:pl-10 sm:text-base"
          />
        </label>
        {fixedCategory ? (
          <input type="hidden" name="category" value={fixedCategory} />
        ) : (
          <select name="category" defaultValue={category ?? ""} className="h-11 rounded-full border border-white/10 bg-black/70 px-3 text-sm font-bold text-white sm:h-12 sm:text-base">
            <option value="">Tudo</option>
            <option value="VEHICLE">Veículo</option>
            <option value="REAL_ESTATE">Imóvel</option>
          </select>
        )}
        <select name="sort" defaultValue={sort ?? "relevance"} className="h-11 rounded-full border border-white/10 bg-black/70 px-3 text-sm font-bold text-white sm:h-12 sm:text-base">
          <option value="relevance">Mais relevantes</option>
          <option value="newest">Mais recentes</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
          <option value="expiring">Expira primeiro</option>
        </select>
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full btn-gold px-4 text-sm sm:h-12 sm:text-base">
          <SlidersHorizontal size={16} />
          Buscar
        </button>
      </div>

      <details className="mt-2 rounded-2xl border border-white/10 bg-black/35 p-3 sm:mt-3">
        <summary className="cursor-pointer text-sm font-black text-yellow-300">Filtros avançados</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select name="type" className="h-11 rounded-full border border-white/10 bg-black/70 px-3 font-bold text-white">
            <option value="">Tipo</option>
            {(currentCategory === "VEHICLE" ? categories.VEHICLE : currentCategory === "REAL_ESTATE" ? categories.REAL_ESTATE : [...categories.VEHICLE, ...categories.REAL_ESTATE]).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <LocationFields compact />
          <input name="district" placeholder="Bairro ou região" className="filter-input" />
          <CurrencyInput name="min" defaultValue={min} placeholder="Preço mínimo" className="filter-input" />
          <CurrencyInput name="max" defaultValue={max} placeholder="Preço máximo" className="filter-input" />

          {currentCategory !== "REAL_ESTATE" && (
            <>
              <input name="brand" placeholder="Marca" className="filter-input" />
              <input name="model" placeholder="Modelo" className="filter-input" />
              <input name="minYear" type="number" placeholder="Ano mínimo" className="filter-input" />
              <input name="maxYear" type="number" placeholder="Ano máximo" className="filter-input" />
              <input name="color" placeholder="Cor" className="filter-input" />
              <input name="fuel" placeholder="Combustível" className="filter-input" />
              <input name="gearbox" placeholder="Câmbio" className="filter-input" />
              <IntegerInput name="maxMileageKm" placeholder="Km máximo" className="filter-input" />
            </>
          )}

          {currentCategory !== "VEHICLE" && (
            <>
              <select name="purpose" className="h-11 rounded-full border border-white/10 bg-black/70 px-3 font-bold text-white">
                <option value="">Venda ou locação</option>
                <option value="Venda">Venda</option>
                <option value="Locação">Locação</option>
              </select>
              <input name="bedrooms" type="number" min="0" placeholder="Quartos min." className="filter-input" />
              <input name="bathrooms" type="number" min="0" placeholder="Banheiros min." className="filter-input" />
              <input name="parking" type="number" min="0" placeholder="Vagas min." className="filter-input" />
              <input name="minAreaM2" type="number" min="0" placeholder="Área mínima" className="filter-input" />
              <input name="maxAreaM2" type="number" min="0" placeholder="Área máxima" className="filter-input" />
            </>
          )}
        </div>
      </details>
    </form>
  );
}
