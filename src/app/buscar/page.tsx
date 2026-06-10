import { ListingResults } from "@/components/listing-results";
import { SearchPanel } from "@/components/search-panel";
import type { ListingSearchParams } from "@/lib/listing-search";

export const dynamic = "force-dynamic";

export default function SearchPage({ searchParams }: { searchParams: ListingSearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-yellow-300">Busca</p>
        <h1 className="mt-2 text-3xl font-black">Encontre Veículos e Imóveis</h1>
      </div>
      <SearchPanel q={searchParams.q} category={searchParams.category} type={searchParams.type} brand={searchParams.brand} fuel={searchParams.fuel} min={searchParams.min} max={searchParams.max} purpose={searchParams.purpose} sort={searchParams.sort} />
      <section className="mt-6">
        <ListingResults searchParams={searchParams} />
      </section>
    </main>
  );
}
