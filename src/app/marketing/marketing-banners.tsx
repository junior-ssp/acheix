import { MarketingFocusScroll } from "./marketing-focus-scroll";

export const marketingBanners = [
  {
    id: "profissoes",
    title: "Profissões",
    pagePath: "/marketing/profissoes.png",
    imagePath: "/marketing-assets/profissoes.png",
    socialImagePath: "/marketing-social/profissoes.jpg"
  },
  {
    id: "veiculos",
    title: "Veículos",
    pagePath: "/marketing/veiculos.png",
    imagePath: "/marketing-assets/veiculos.png",
    socialImagePath: "/marketing-social/veiculos.jpg"
  },
  {
    id: "imoveis",
    title: "Imóveis",
    pagePath: "/marketing/imoveis.png",
    imagePath: "/marketing-assets/imoveis.png",
    socialImagePath: "/marketing-social/imoveis.jpg"
  }
] as const;

export type MarketingBannerId = (typeof marketingBanners)[number]["id"];

export function getMarketingBanner(id: MarketingBannerId) {
  return marketingBanners.find((banner) => banner.id === id) ?? marketingBanners[0];
}

export function MarketingBannersPage({ focusId }: { focusId?: MarketingBannerId }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8">
      <MarketingFocusScroll focusId={focusId} />
      <h1 className="text-2xl font-black sm:text-3xl">Marketing</h1>
      <div className="mt-5 grid gap-5">
        {marketingBanners.map((banner) => (
          <section
            key={banner.id}
            id={banner.id}
            className={`scroll-mt-5 overflow-hidden rounded-lg border bg-black shadow ${focusId === banner.id ? "border-yellow-300" : "border-white/10"}`}
          >
            <a href="/" aria-label={`Ir para a página inicial - ${banner.title}`} className="block">
              <img src={banner.imagePath} alt={`Banner Achei X - ${banner.title}`} className="h-auto w-full" />
            </a>
          </section>
        ))}
      </div>
    </main>
  );
}
