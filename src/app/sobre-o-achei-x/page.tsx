import Link from "next/link";
import type { Metadata } from "next";
import { BackButton } from "@/components/back-button";
import { legalCompany } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Sobre o Achei X",
  description: `${legalCompany.institutionalText} Contato: ${legalCompany.contactEmail}.`
};

export default function AboutAcheiXPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-yellow-300">Achei X</p>
          <h1 className="mt-2 text-3xl font-black">Sobre o Achei X</h1>
        </div>
        <BackButton label="Voltar" />
      </div>

      <section className="mt-6 space-y-4 rounded-lg border border-white/10 bg-neutral-900 p-6 text-neutral-200">
        <h2 className="text-xl font-black text-yellow-300">Informações Legais</h2>
        <p>{legalCompany.institutionalText}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Info label="Razão Social" value={legalCompany.legalName} />
          <Info label="CNPJ" value={legalCompany.cnpj} />
          <Info label="E-mail de contato" value={legalCompany.contactEmail} href={`mailto:${legalCompany.contactEmail}`} />
          <Info label="Cidade/Sede" value={legalCompany.headquarters} />
        </dl>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/termos-de-uso" className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-yellow-300 hover:bg-yellow-300/10">
            Termos de Uso
          </Link>
          <Link href="/politica-de-privacidade" className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-yellow-300 hover:bg-yellow-300/10">
            Política de Privacidade
          </Link>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 p-3">
      <dt className="text-xs font-black uppercase text-neutral-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-black text-white">
        {href ? <a href={href} className="text-yellow-300">{value}</a> : value}
      </dd>
    </div>
  );
}
