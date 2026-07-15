import type { Metadata } from "next";
import { legalCompany } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: `Termos de Uso do Achei X. ${legalCompany.institutionalText}`
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-6xl px-0 py-0 sm:px-4 sm:py-6">
      <iframe
        src="/downloads/termos-de-uso-achei-x-visual.html"
        title="Termos de Uso do Achei X"
        className="h-[calc(100vh-9.7rem)] min-h-[720px] w-full border-0 bg-black sm:h-[calc(100vh-8rem)] sm:rounded-lg sm:border sm:border-white/10"
      />
    </main>
  );
}
