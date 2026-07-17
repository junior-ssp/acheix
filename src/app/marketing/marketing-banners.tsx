import { PublicShareButton } from "@/components/public-share-button";
import { MarketingFocusScroll } from "./marketing-focus-scroll";

export const marketingBanners = [
  {
    id: "geral",
    title: "Banner Geral",
    pagePath: "/marketing/banner-achei-x.png",
    imagePath: "/marketing-assets/banner-geral.png",
    socialImagePath: "/marketing-social/banner-geral-contain-v2.jpg"
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
          <section key={banner.id} id={banner.id} className={`relative scroll-mt-5 overflow-hidden rounded-lg border bg-black shadow ${focusId === banner.id ? "border-yellow-300" : "border-white/10"}`}>
            <a href="https://www.acheix.com.br" aria-label={`Ir para a página inicial - ${banner.title}`} className="block">
              <img src={banner.imagePath} alt={`Banner Achei X - ${banner.title}`} className="h-auto w-full" />
            </a>
            <div className="absolute right-3 top-3">
              <PublicShareButton title="Banner Geral Achei X" path={banner.pagePath} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
