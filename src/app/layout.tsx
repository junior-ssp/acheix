import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { User } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { AdminAutoLogout } from "@/components/admin-auto-logout";
import { NotificationPopups } from "@/components/notification-popups";
import { PushRegistration } from "@/components/push-registration";
import { AndroidBackHandler } from "@/components/android-back-handler";
import { AppUpdatePrompt } from "@/components/app-update-prompt";
import { BottomNavigation } from "@/components/bottom-navigation";
import { KeyboardSafeScroll } from "@/components/keyboard-safe-scroll";
import { ThemeColorButton } from "@/components/theme-color-button";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://acheix.com.br").replace(/\/$/, "")),
  title: {
    default: "Achei X Classificados",
    template: "%s | Achei X"
  },
  description: "Classificados modernos para Veículos e Imóveis.",
  applicationName: "Achei X",
  robots: "index, follow"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f766e"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const adminShell = headers().get("x-acheix-admin-shell") === "1";
  const user = adminShell ? null : await getCurrentUser().catch(() => null);
  const userInitials = initialsFromName(user?.name);

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Script id="acheix-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("acheix-theme");if(t==="light"){document.documentElement.classList.remove("dark");document.documentElement.classList.add("theme-light");document.documentElement.style.colorScheme="light";}}catch(e){}`}
        </Script>
        {!adminShell ? <header className="sticky top-0 z-30 border-b border-white/10 bg-black/95 backdrop-blur-xl app-safe-top">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:py-3">
            <Link href="/" className="flex h-10 min-w-0 shrink items-center" aria-label="Achei X">
              <Image src="/achei-x-top-logo.png" alt="Achei X" width={1024} height={410} priority className="h-10 w-auto max-w-[128px] shrink-0 object-contain sm:max-w-[160px]" />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full px-3 text-xs btn-gold sm:px-4 sm:text-sm"
                href="/planos"
              >
                Planos
              </Link>
              <a
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-black shadow-sm shadow-[#22C55E]/20 transition hover:bg-[#34D399] sm:w-auto sm:gap-1.5 sm:px-4 sm:text-sm"
                href="/baixar-app"
                aria-label="Baixar App Android"
                title="Baixar App Android"
              >
                <AndroidLogo />
                <span className="hidden whitespace-nowrap sm:inline">Baixar App</span>
              </a>
              <Link
                className="hidden h-10 items-center justify-center rounded-full px-3 text-xs btn-gold sm:inline-flex sm:px-4 sm:text-sm"
                href="/dashboard#meus-anuncios"
                prefetch={false}
              >
                Meus Anúncios
              </Link>
              <Link
                className={`relative grid h-10 w-10 place-items-center rounded-full border text-white transition ${
                  user
                    ? "border-emerald-300/70 bg-emerald-400/15 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.22)] hover:border-emerald-200 hover:bg-emerald-300/20"
                    : "border-white/10 bg-white/5 hover:border-yellow-300/50 hover:bg-yellow-300/10 hover:text-yellow-300"
                }`}
                href={user ? "/dashboard#perfil" : "/entrar"}
                aria-label={user ? `Conta logada: ${user.name}` : "Entrar na conta"}
                title={user ? `Logado como ${user.name}` : "Entrar"}
              >
                {user ? <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-emerald-300 via-yellow-200 to-emerald-500 text-sm font-black text-black">{userInitials}</span> : <User size={19} strokeWidth={2.4} />}
                {user ? <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-black bg-emerald-300" aria-hidden="true" /> : null}
              </Link>
              <AccountMenu />
              <ThemeColorButton />
            </div>
          </div>
        </header> : null}
        <div>{children}</div>
        {!adminShell ? <footer className="border-t border-white/10 bg-black px-4 pb-[calc(5.4rem+env(safe-area-inset-bottom,0px))] pt-4 text-xs text-neutral-400 sm:pb-4 sm:text-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-between">
            <span>© 2024 Achei X. Todos os direitos reservados.</span>
            <span className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Link href="/dicas-uteis" className="rounded-full border border-yellow-300/30 px-3 py-1 font-black text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">Dicas úteis</Link>
              <Link href="/termos-de-uso" className="rounded-full border border-white/10 px-3 py-1 font-black text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">Termos de Uso</Link>
              <Link href="/politica-de-privacidade" className="rounded-full border border-white/10 px-3 py-1 font-black text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">Privacidade</Link>
            </span>
          </div>
        </footer> : null}
        {!adminShell ? <AndroidBackHandler /> : null}
        {!adminShell ? <PushRegistration /> : null}
        {!adminShell ? <NotificationPopups /> : null}
        {!adminShell ? <AppUpdatePrompt /> : null}
        {!adminShell ? <KeyboardSafeScroll /> : null}
        {!adminShell ? <BottomNavigation /> : null}
        {adminShell ? <AdminAutoLogout /> : null}
      </body>
    </html>
  );
}

function AndroidLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current sm:h-5 sm:w-5">
      <path d="M7.2 8.6h9.6c.5 0 .9.4.9.9v6.7c0 .5-.4.9-.9.9h-.7v2.1c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1v-2.1h-3.8v2.1c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1v-2.1h-.7c-.5 0-.9-.4-.9-.9V9.5c0-.5.4-.9.9-.9Zm-2.4.4c.6 0 1.1.5 1.1 1.1v4.8c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1v-4.8c0-.6.5-1.1 1.1-1.1Zm14.4 0c.6 0 1.1.5 1.1 1.1v4.8c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1v-4.8c0-.6.5-1.1 1.1-1.1ZM8.1 3.7 6.8 2.4c-.2-.2-.2-.5 0-.7s.5-.2.7 0l1.5 1.5c.9-.4 1.9-.6 3-.6s2.1.2 3 .6l1.5-1.5c.2-.2.5-.2.7 0s.2.5 0 .7l-1.3 1.3c1.1.8 1.8 2 1.8 3.3H6.3c0-1.3.7-2.5 1.8-3.3Zm1.3 1.8a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Zm5.2 0a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Z" />
    </svg>
  );
}

function initialsFromName(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return "AX";
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return initials.toUpperCase();
}


