import { ListingResults } from "@/components/listing-results";
import { SearchPanel } from "@/components/search-panel";
import { SearchResultModal } from "@/components/search-result-modal";
import { findActiveListings, type ListingSearchParams } from "@/lib/listing-search";
import { findActiveManualListings } from "@/lib/manual-listings";
import { PackageSearch, Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductsSearchParams = ListingSearchParams & { modo?: string };

export default async function ProductsPage({ searchParams }: { searchParams: ProductsSearchParams | Promise<ProductsSearchParams> }) {
  const currentSearchParams = await searchParams;
  const hasSubmittedSearch = currentSearchParams.searched === "1";
  const showSearchTools = currentSearchParams.modo === "buscar" || hasSubmittedSearch;
  const [listings, manualListings] = await Promise.all([
    findActiveListings(hasSubmittedSearch ? currentSearchParams : {}, "PRODUCT"),
    findActiveManualListings({ categories: ["PRODUCT"], limit: 24 })
  ]);
  const resultCount = listings.length;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-yellow-300">Produtos</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={("/produtos?modo=buscar" as Route)} className="flex min-h-24 items-center gap-4 rounded-2xl border border-amber-300 bg-amber-300/10 p-4 text-white transition hover:-translate-y-0.5 hover:bg-amber-300/15">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-300 text-black"><PackageSearch size={26} /></span>
          <span><strong className="block text-xl font-black">Buscar Produtos</strong><span className="text-sm text-neutral-300">Celulares, eletrônicos, roupas e mais.</span></span>
        </Link>
        <Link href="/anunciar?category=PRODUCT&planCode=PRODUCT_MINI" className="flex min-h-24 items-center gap-4 rounded-2xl border border-yellow-300 bg-yellow-300 p-4 text-black transition hover:-translate-y-0.5 hover:bg-yellow-200">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black text-yellow-300"><Pencil size={26} /></span>
          <span><strong className="block text-xl font-black">Anunciar Produto</strong></span>
        </Link>
      </div>

      {showSearchTools ? (
        <div className="mt-5">
          <SearchPanel
            q={currentSearchParams.q}
            category="PRODUCT"
            type={currentSearchParams.type}
            min={currentSearchParams.min}
            max={currentSearchParams.max}
            sort={currentSearchParams.sort}
            action="/produtos"
            fixedCategory="PRODUCT"
          />
        </div>
      ) : null}

      {hasSubmittedSearch ? (
        <SearchResultModal
          count={resultCount}
          labelSingular="produto"
          labelPlural="produtos"
          emptyMessage="Nenhum produto encontrado com esses filtros."
          resetHref={("/produtos" as Route)}
          resultMode="scroll"
        />
      ) : null}

      <section id="resultados-anuncios" className="mt-6 scroll-mt-24">
        <ListingResults searchParams={currentSearchParams} category="PRODUCT" emptyTitle="Nenhum Produto ativo encontrado." listings={listings} manualListings={manualListings} />
      </section>
    </main>
  );
}
