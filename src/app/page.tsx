import Link from "next/link";
import { Car, HomeIcon, Wrench } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { SearchPanel } from "@/components/search-panel";
import { demoListings } from "@/lib/constants";
import { findActiveListings, findHomeListings } from "@/lib/listing-search";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const hasSearch = Boolean(searchParams.q || searchParams.category);
  const homeListings = hasSearch ? null : await findHomeListings(8);
  const databaseListings = hasSearch ? await findActiveListings({ q: searchParams.q, category: searchParams.category }) : [];
  const listings = databaseListings.length ? databaseListings : demoListings;
  const vehicles = homeListings?.vehicles.length ? homeListings.vehicles : listings.filter((item) => item.category === "VEHICLE").slice(0, 8);
  const realEstate = homeListings?.realEstate.length ? homeListings.realEstate : listings.filter((item) => item.category === "REAL_ESTATE").slice(0, 8);

  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-5">
          <div>
            <SearchPanel q={searchParams.q} category={searchParams.category} compact />
            <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/veiculos" prefetch={false} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#22C55E] px-2 text-center text-xs font-black text-black transition hover:bg-[#34D399] sm:h-12 sm:min-w-36 sm:px-5 sm:text-base">
                <Car size={16} strokeWidth={2.6} />
                Buscar Veículo
              </Link>
              <Link href="/imoveis" prefetch={false} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#22C55E] px-2 text-center text-xs font-black text-black transition hover:bg-[#34D399] sm:h-12 sm:min-w-36 sm:px-5 sm:text-base">
                <HomeIcon size={16} strokeWidth={2.6} />
                Buscar Imóvel
              </Link>
              <Link href="/servicos" prefetch={false} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#22C55E] px-2 text-center text-xs font-black text-black transition hover:bg-[#34D399] sm:h-12 sm:min-w-36 sm:px-5 sm:text-base">
                <Wrench size={16} strokeWidth={2.6} />
                Buscar Serviços
              </Link>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-3 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/anunciar?category=VEHICLE" prefetch={false} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-center text-xs btn-gold sm:h-12 sm:min-w-36 sm:px-5 sm:text-base">
                <Car size={16} strokeWidth={2.6} />
                Anunciar Veículo
              </Link>
              <Link href="/anunciar?category=REAL_ESTATE" prefetch={false} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-center text-xs btn-gold sm:h-12 sm:min-w-36 sm:px-5 sm:text-base">
                <HomeIcon size={16} strokeWidth={2.6} />
                Anunciar Imóvel
              </Link>
              <Link href="/servicos/planos" prefetch={false} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-center text-xs btn-gold sm:h-12 sm:min-w-36 sm:px-5 sm:text-base">
                <Wrench size={16} strokeWidth={2.6} />
                Anunciar Serviços
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-3 pb-8 sm:gap-6 sm:px-4 sm:pb-10">
        <Section title="IMÓVEIS" listings={realEstate} empty="Nenhum Imóvel ativo encontrado." />
        <Section title="VEÍCULOS" listings={vehicles} empty="Nenhum Veículo ativo encontrado." />
      </section>
    </main>
  );
}

function Section({ title, listings, empty }: { title: string; listings: any[]; empty: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <h2 className="text-lg font-black sm:text-2xl">{title}</h2>
      </div>
      {listings.length ? (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      ) : (
        <EmptyState title={empty} description="Quando anúncios forem aprovados, eles aparecem automaticamente aqui." />
      )}
    </div>
  );
}


