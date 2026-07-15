"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, PlusCircle, Search, User } from "lucide-react";
import { setAppBadgeCount } from "@/lib/app-badge-client";

type NavHref = Route | `${Route}#${string}`;

type BottomNavigationItem = {
  href: NavHref;
  label: string;
  icon: typeof Home;
  featured?: boolean;
  match: (pathname: string, hash: string) => boolean;
};

const items: BottomNavigationItem[] = [
  { href: "/", label: "Início", icon: Home, match: (pathname) => pathname === "/" },
  { href: "/buscar", label: "Buscar", icon: Search, match: (pathname) => ["/buscar", "/veiculos", "/imoveis", "/produtos", "/empresas", "/servicos"].some((path) => pathname === path || pathname.startsWith(`${path}/`)) },
  { href: "/anunciar", label: "Anunciar", icon: PlusCircle, featured: true, match: (pathname) => pathname === "/anunciar" || pathname.startsWith("/anunciar/") },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle, match: (pathname) => pathname === "/mensagens" },
  { href: "/dashboard", label: "Conta", icon: User, match: (pathname, hash) => ["/entrar", "/cadastro"].some((path) => pathname === path || pathname.startsWith(`${path}/`)) || (pathname === "/dashboard" && !["#mensagens", "#interesses"].includes(hash)) }
];

export function BottomNavigation() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [userSelectedNav, setUserSelectedNav] = useState(false);
  const [pendingHref, setPendingHref] = useState<NavHref | null>(null);
  const [hash, setHash] = useState("");
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    setPendingHref(null);
    setHash(window.location.hash);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadUnreadCount() {
      const response = await fetch("/api/messages/unread-counts", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => null);
      const count = Number(data?.unreadCount ?? data?.counts?.total ?? 0);
      if (!Number.isFinite(count) || cancelled) return;
      setMessageUnreadCount(Math.max(0, count));
      await setAppBadgeCount(Math.max(0, count));
    }

    void loadUnreadCount();
    const timer = window.setInterval(loadUnreadCount, 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  function primeNavigation(href: NavHref) {
    setUserSelectedNav(true);
    setPendingHref(href);
    router.prefetch(href as Route);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/95 px-2 pt-1 backdrop-blur-xl app-safe-bottom sm:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map((item) => {
          const active = item.match(pathname, hash);
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
              className={`bottom-nav-link flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-bold transition ${highlighted ? "is-active text-yellow-300" : "text-neutral-300 hover:text-yellow-200"}`}
            >
              <span className="grid h-10 w-10 place-items-center">
                <span
                  className={`bottom-nav-icon relative grid place-items-center rounded-full transition ${highlighted ? "is-active" : ""} ${
                    highlighted
                      ? item.featured
                        ? "h-10 w-10 gradient-gold text-black shadow-[0_0_18px_rgb(255_214_0_/_0.28)]"
                        : "h-8 w-8 bg-yellow-300/10 text-yellow-300 ring-1 ring-yellow-300/35"
                      : "h-7 w-7 text-current"
                  }`}
                >
                  <Icon size={item.featured ? 21 : highlighted ? 19 : 18} strokeWidth={highlighted ? 2.8 : 2.4} />
                  {item.label === "Mensagens" && messageUnreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white">
                      {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

