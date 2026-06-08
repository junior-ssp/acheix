import { ListingResults } from "@/components/listing-results";
import { SearchPanel } from "@/components/search-panel";
import type { ListingSearchParams } from "@/lib/listing-search";

export const dynamic = "force-dynamic";

export default function RealEstatePage({ searchParams }: { searchParams: ListingSearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-yellow-300">Imóveis</p>
        <h1 className="mt-2 text-3xl font-black">Casa, Apto, Terreno e Locação</h1>
      </div>
      <SearchPanel q={searchParams.q} category="REAL_ESTATE" min={searchParams.min} max={searchParams.max} sort={searchParams.sort} action="/imoveis" fixedCategory="REAL_ESTATE" />
      <section className="mt-6">
        <ListingResults searchParams={searchParams} category="REAL_ESTATE" emptyTitle="Nenhum Imóvel ativo encontrado." />
      </section>
    </main>
  );
}
