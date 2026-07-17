"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { AdminAutoLogout } from "@/components/admin-auto-logout";
import { AndroidBackHandler } from "@/components/android-back-handler";
import { BottomNavigation } from "@/components/bottom-navigation";
import { KeyboardSafeScroll } from "@/components/keyboard-safe-scroll";
import { UserAccountLink } from "@/components/user-account-link";
import { legalCompany } from "@/lib/legal-info";

const NotificationPopups = dynamic(() => import("@/components/notification-popups").then((mod) => mod.NotificationPopups), { ssr: false });
const PushRegistration = dynamic(() => import("@/components/push-registration").then((mod) => mod.PushRegistration), { ssr: false });
const AppUpdatePrompt = dynamic(() => import("@/components/app-update-prompt").then((mod) => mod.AppUpdatePrompt), { ssr: false });
const EmailAutoValidatedPopup = dynamic(() => import("@/components/email-auto-validated-popup").then((mod) => mod.EmailAutoValidatedPopup), { ssr: false });

export function AppChrome({ children, initialAdminShell = false }: { children: React.ReactNode; initialAdminShell?: boolean }) {
  const pathname = usePathname();
  const adminShell = initialAdminShell || pathname === "/admin" || pathname.startsWith("/admin/");
  const immersiveMessageThread = pathname.startsWith("/mensagens/");
  const [nonCriticalReady, setNonCriticalReady] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setNonCriticalReady(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (adminShell || pathname.startsWith("/api/")) return;
    const timer = window.setTimeout(() => {
      fetch("/api/site-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pagePath: pathname }),
        keepalive: true
      }).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [adminShell, pathname]);

  useEffect(() => {
    if (adminShell) return;
    let cancelled = false;

    async function loadUnreadCount() {
      const response = await fetch("/api/messages/unread-counts", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => null);
      const count = Number(data?.unreadCount ?? data?.counts?.total ?? 0);
      if (!Number.isFinite(count) || cancelled) return;
      setMessageUnreadCount(Math.max(0, count));
    }

    void loadUnreadCount();
    const timer = window.setInterval(loadUnreadCount, 45000);
    window.addEventListener("focus", loadUnreadCount);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", loadUnreadCount);
    };
  }, [adminShell]);

  return (
    <>
      {!adminShell ? <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl app-safe-top">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 py-2 sm:h-16 sm:py-3">
          <Link href="/" prefetch={false} className="flex h-10 min-w-0 shrink items-center" aria-label="Achei X">
            <Image src="/achei-x-top-logo-small.png" alt="Achei X" width={360} height={144} priority className="h-10 w-auto max-w-[128px] shrink-0 object-contain sm:max-w-[160px]" />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-full px-3 text-xs btn-gold sm:px-4 sm:text-sm"
              href="/planos"
              prefetch={false}
            >
              Planos
            </Link>
            <a
              className="acheix-download-neon inline-flex h-10 shrink-0 items-center justify-center rounded-full px-3 text-xs sm:px-4 sm:text-sm"
              href="/baixar-app"
              aria-label="Baixar App Android"
              title="Baixar App Android"
            >
              <span className="whitespace-nowrap">Baixar App</span>
            </a>
            <Link
              className="hidden h-10 items-center justify-center rounded-full px-3 text-xs btn-gold sm:inline-flex sm:px-4 sm:text-sm"
              href="/dashboard#meus-anuncios"
              prefetch={false}
            >
              Meus Anúncios
            </Link>
            <Link
              className="relative hidden h-10 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-black text-white transition hover:border-yellow-300/50 hover:bg-yellow-300/10 hover:text-yellow-300 sm:inline-flex sm:px-4 sm:text-sm"
              href="/mensagens"
              prefetch={false}
            >
              <MessageCircle size={17} strokeWidth={2.7} />
              Mensagens
              {messageUnreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white">
                  {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                </span>
              ) : null}
            </Link>
            <UserAccountLink />
            <AccountMenu />
          </div>
        </div>
      </header> : null}
      {!adminShell ? <div aria-hidden className="h-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(4rem+env(safe-area-inset-top,0px))]" /> : null}
      <div>{children}</div>
      {!adminShell && !immersiveMessageThread ? <footer className="border-t border-white/10 bg-black px-4 pb-[calc(5.4rem+env(safe-area-inset-bottom,0px))] pt-4 text-xs text-neutral-400 sm:pb-4 sm:text-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-between">
          <span className="text-center sm:text-left">© 2026 Achei X<br />{legalCompany.legalName}</span>
          <span className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Link href={"/fale-conosco" as Route} className="rounded-full border border-white/10 px-3 py-1 font-black text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">Fale Conosco</Link>
            <Link href="/sobre-o-achei-x" className="rounded-full border border-white/10 px-3 py-1 font-black text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">Informações Legais</Link>
            <Link href="/termos-de-uso" className="rounded-full border border-white/10 px-3 py-1 font-black text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">Termos de Uso</Link>
            <Link href="/politica-de-privacidade" className="rounded-full border border-white/10 px-3 py-1 font-black text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">Privacidade</Link>
          </span>
        </div>
      </footer> : null}
      {!adminShell ? <AndroidBackHandler /> : null}
      {nonCriticalReady ? <PushRegistration showPermissionPrompt={!adminShell} /> : null}
      {!adminShell && nonCriticalReady ? <NotificationPopups /> : null}
      {!adminShell && nonCriticalReady ? <AppUpdatePrompt /> : null}
      {!adminShell ? <EmailAutoValidatedPopup /> : null}
      {!adminShell ? <KeyboardSafeScroll /> : null}
      {!adminShell && !immersiveMessageThread ? <BottomNavigation /> : null}
      {adminShell ? <AdminAutoLogout /> : null}
    </>
  );
}
