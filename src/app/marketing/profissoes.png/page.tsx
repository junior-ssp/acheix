import type { Metadata } from "next";
import { getMarketingBanner, MarketingBannersPage } from "../marketing-banners";

const banner = getMarketingBanner("profissoes");
const publicBaseUrl = "https://www.acheix.com.br";

export const metadata: Metadata = {
  title: `${banner.title} - Marketing Achei X`,
  description: "Banner oficial do Achei X para divulgação.",
  openGraph: {
    title: `${banner.title} - Achei X`,
    description: "Anuncie grátis no Achei X.",
    url: `${publicBaseUrl}${banner.pagePath}`,
    type: "website",
    images: [{ url: `${publicBaseUrl}${banner.socialImagePath}`, width: 1200, height: 630, alt: `Banner Achei X - ${banner.title}` }]
  },
  twitter: {
    card: "summary_large_image",
    title: `${banner.title} - Achei X`,
    description: "Anuncie grátis no Achei X.",
    images: [`${publicBaseUrl}${banner.socialImagePath}`]
  }
};

export default function MarketingProfissoesPage() {
  return <MarketingBannersPage focusId="profissoes" />;
}
