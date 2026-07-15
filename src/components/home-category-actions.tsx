"use client";

import Link from "next/link";
import type { Route } from "next";
import { Building2, Car, HomeIcon, Package, Wrench } from "lucide-react";

type HomeActionCategory = {
  key: "products" | "vehicles" | "realEstate" | "companies" | "services";
  label: string;
  icon: typeof Car;
  accent: string;
  href: Route;
};

const categories: HomeActionCategory[] = [
  { key: "products", label: "Produtos", icon: Package, accent: "from-orange-300 to-amber-600", href: "/produtos" },
  { key: "vehicles", label: "Ve\u00edculos", icon: Car, accent: "from-emerald-400 to-green-600", href: "/veiculos" },
  { key: "realEstate", label: "Im\u00f3veis", icon: HomeIcon, accent: "from-sky-300 to-cyan-600", href: "/imoveis" },
  { key: "companies", label: "Empresas / Lojas", icon: Building2, accent: "from-violet-300 to-purple-600", href: "/empresas" as Route },
  { key: "services", label: "Servi\u00e7os", icon: Wrench, accent: "from-yellow-300 to-amber-500", href: "/servicos" }
];

const categoryButtonStyles: Record<HomeActionCategory["key"], string> = {
  products: "border-yellow-300/80 bg-yellow-300/80 text-black hover:bg-yellow-300/90 shadow-[0_0_18px_rgba(250,204,21,0.25)]",
  vehicles: "border-emerald-400/80 bg-emerald-400/80 text-black hover:bg-emerald-400/90 shadow-[0_0_18px_rgba(16,185,129,0.24)]",
  realEstate: "border-sky-300/80 bg-sky-300/80 text-black hover:bg-sky-300/90 shadow-[0_0_18px_rgba(56,189,248,0.24)]",
  companies: "border-violet-300/80 bg-violet-300/80 text-black hover:bg-violet-300/90 shadow-[0_0_18px_rgba(168,85,247,0.24)]",
  services: "border-amber-300/80 bg-amber-300/80 text-black hover:bg-amber-300/90 shadow-[0_0_18px_rgba(245,158,11,0.24)]"
};

export function HomeCategoryActions() {
  return (
    <div className="mt-3 sm:mt-4">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.key}
              href={category.href}
              prefetch={false}
              className={`grid aspect-square min-w-0 place-items-center rounded-xl border p-1.5 text-center transition sm:p-2 ${categoryButtonStyles[category.key]}`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${category.accent} text-black shadow-sm sm:h-9 sm:w-9`}>
                <Icon size={19} strokeWidth={2.7} />
              </span>
              <span className="mt-1 text-[11px] font-black leading-tight sm:text-xs">{category.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
