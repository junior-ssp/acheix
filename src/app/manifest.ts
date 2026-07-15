import type { MetadataRoute } from "next";
import { legalCompany } from "@/lib/legal-info";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Achei X Classificados",
    short_name: "Achei X",
    description: `${legalCompany.institutionalText} Classificados para Veículos, Imóveis e Serviços.`,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}
