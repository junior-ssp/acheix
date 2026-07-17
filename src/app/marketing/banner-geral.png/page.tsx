import type { Metadata } from "next";
import { getMarketingBanner, MarketingBannersPage } from "../marketing-banners";

const banner = getMarketingBanner("geral");
const publicBaseUrl = "https://www.acheix.com.br";

export const metadata: Metadata = {
  title: "Na hora de Comprar, Vender ou Alugar - Achei X é o Lugar !!!",
  description: "Banner oficial do Achei X para divulgação.",
  openGraph: {
    title: "Na hora de Comprar, Vender ou Alugar - Achei X é o Lugar !!!",
    description: "Venda, compre, alugue e encontre serviços no Achei X.",
    url: `${publicBaseUrl}${banner.pagePath}`,
    type: "website",
    images: [{ url: `${publicBaseUrl}${banner.socialImagePath}`, width: 1200, height: 630, alt: "Banner Geral Achei X" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Na hora de Comprar, Vender ou Alugar - Achei X é o Lugar !!!",
    description: "Venda, compre, alugue e encontre serviços no Achei X.",
    images: [`${publicBaseUrl}${banner.socialImagePath}`]
  }
};

export default function MarketingBannerGeralPage() {
  return <MarketingBannersPage focusId="geral" />;
}
