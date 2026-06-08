"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, PlusCircle, Search, User } from "lucide-react";

type BottomNavigationItem = {
  href: Route;
  label: string;
  icon: typeof Home;
  featured?: boolean;
  match: (pathname: string) => boolean;
};

const items: BottomNavigationItem[] = [
  { href: "/", label: "Início", icon: Home, match: (pathname) => pathname === "/" },
  { href: "/buscar", label: "Buscar", icon: Search, match: (pathname) => ["/buscar", "/veiculos", "/imoveis"].some((path) => pathname === path || pathname.startsWith(`${path}/`)) },
  { href: "/anunciar", label: "Anunciar", icon: PlusCircle, featured: true, match: (pathname) => pathname === "/anunciar" || pathname.startsWith("/anunciar/") },
  { href: "/mensagens", label: "Chat", icon: MessageCircle, match: (pathname) => pathname === "/mensagens" || pathname.startsWith("/mensagens/") },
  { href: "/dashboard", label: "Conta", icon: User, match: (pathname) => ["/dashboard", "/entrar", "/cadastro"].some((path) => pathname === path || pathname.startsWith(`${path}/`)) }
];

export function BottomNavigation() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [userSelectedNav, setUserSelectedNav] = useState(false);
  const [pendingHref, setPendingHref] = useState<Route | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function primeNavigation(href: Route) {
    setUserSelectedNav(true);
    setPendingHref(href);
    router.prefetch(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/95 px-2 pt-1 backdrop-blur-xl app-safe-bottom sm:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map((item) => {
          const active = item.match(pathname);
          const defaultFeatured = item.featured && !userSelectedNav;
          const highlighted = userSelectedNav ? (pendingHref ? item.href === pendingHref : active) : defaultFeatured;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              onPointerDown={() => primeNavigation(item.href)}
              onFocus={() => router.prefetch(item.href)}
              className={`bottom-nav-link flex min-w-12 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition ${highlighted ? "is-active text-yellow-300" : "text-neutral-300 hover:text-yellow-200"}`}
            >
              <span
                className={`bottom-nav-icon grid place-items-center rounded-full transition ${highlighted ? "is-active" : ""} ${
                  highlighted
                    ? item.featured
                      ? "h-9 w-9 gradient-gold text-black shadow-[0_0_18px_rgb(255_214_0_/_0.28)]"
                      : "h-8 w-8 bg-yellow-300/10 text-yellow-300 ring-1 ring-yellow-300/35"
                    : "h-7 w-7 text-current"
                }`}
              >
                <Icon size={item.featured ? 20 : highlighted ? 19 : 18} strokeWidth={highlighted ? 2.8 : 2.4} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

