import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/formatters";
import { servicePlans } from "@/lib/service-plans";

export const dynamic = "force-dynamic";

export default function ServicePlansPage() {
  const free = servicePlans.SERVICE_FREE;
  const pro = servicePlans.SERVICE_PRO;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-black uppercase text-yellow-300">Prestadores de Serviços</p>
      <h1 className="mt-2 text-3xl font-black">Escolha seu plano</h1>
      <p className="mt-2 max-w-3xl text-neutral-300">
        Cadastre seu perfil profissional, escolha suas atividades e apareça nas buscas do Achei X.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-white/10 bg-neutral-900 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-yellow-300">
            <CheckCircle2 size={23} />
          </div>
          <h2 className="mt-4 text-2xl font-black">{free.name}</h2>
          <p className="mt-1 text-lg font-black text-yellow-300">6 meses grátis</p>
          <ul className="mt-4 grid gap-2 text-sm text-neutral-200">
            <li>Até {free.maxCategories} atividades profissionais</li>
            <li>Perfil aparece nas buscas de serviços</li>
            <li>Contato protegido pelas regras do Achei X</li>
            <li>Sem foto, cartão ou banner neste momento</li>
          </ul>
          <Link href="/servicos/anunciar?servicePlan=SERVICE_FREE" className="mt-5 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm btn-gold">
            Começar Grátis
          </Link>
        </article>

        <article className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-400 text-black">
            <Sparkles size={23} />
          </div>
          <h2 className="mt-4 text-2xl font-black">{pro.name}</h2>
          <p className="mt-1 text-lg font-black text-emerald-200">{formatCurrencyBRL(pro.priceCents)} por 12 meses</p>
          <ul className="mt-4 grid gap-2 text-sm text-neutral-100">
            <li>Até {pro.maxCategories} atividades profissionais</li>
            <li>Perfil aparece nas buscas de serviços</li>
            <li>Pagamento via PIX com ativação automática</li>
            <li>Sem foto, cartão ou banner neste momento</li>
          </ul>
          <Link href="/servicos/anunciar?servicePlan=SERVICE_PRO" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#22C55E] px-5 text-sm font-black text-black hover:bg-[#34D399]">
            Escolher Plano PRO
          </Link>
        </article>
      </section>
    </main>
  );
}
