import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Achei X Classificados",
    short_name: "Achei X",
    description: "Classificados para Veículos e Imóveis.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0f766e",
    icons: [
      { src: "/achei-x-logo.png", sizes: "1600x1600", type: "image/png" }
    ]
  };
}
