import type { Metadata } from "next";
import { legalCompany } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Política de Privacidade do Achei X. ${legalCompany.institutionalText}`
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-6xl px-0 py-0 sm:px-4 sm:py-6">
      <iframe
        src="/downloads/politica-de-privacidade-achei-x-visual.html"
        title="Política de Privacidade do Achei X"
        className="h-[calc(100vh-9.7rem)] min-h-[720px] w-full border-0 bg-black sm:h-[calc(100vh-8rem)] sm:rounded-lg sm:border sm:border-white/10"
      />
    </main>
  );
}
