import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { AppChrome } from "@/components/app-chrome";
import { DesktopWebShell } from "@/components/desktop-web-shell";
import { legalCompany } from "@/lib/legal-info";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://acheix.com.br").replace(/\/$/, "")),
  title: {
    default: "Achei X Classificados",
    template: "%s | Achei X"
  },
  description: `${legalCompany.institutionalText} Classificados modernos para Veículos, Imóveis e Serviços.`,
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adminShell = headers().get("x-acheix-admin-shell") === "1";

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <DesktopWebShell />
        <AppChrome initialAdminShell={adminShell}>{children}</AppChrome>
      </body>
    </html>
  );
}
