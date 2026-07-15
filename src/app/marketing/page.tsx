import type { Metadata } from "next";
import { MarketingBannersPage } from "./marketing-banners";

export const metadata: Metadata = {
  title: "Marketing - Achei X",
  description: "Banners oficiais do Achei X para divulgação."
};

export default function MarketingPage() {
  return <MarketingBannersPage />;
}
