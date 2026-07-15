import Link from "next/link";
import { CheckCircle2, Sparkles, Tag } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/formatters";
import { publicServicePlanCodes, servicePlans } from "@/lib/service-plans";

export const dynamic = "force-dynamic";

export default function ServicePlansPage() {
  const plans = publicServicePlanCodes.map((code) => servicePlans[code]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-4 sm:p-6">
        <p className="text-sm font-black uppercase text-yellow-300">Empresas e Serviços</p>
        <h1 className="mt-2 text-3xl font-black">Escolha seu Plano</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-200 sm:text-base">
          Cadastre sua empresa ou serviço, escolha as atividades e apareça nas buscas do Achei X.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const paid = plan.priceCents > 0;
          return (
            <article key={plan.code} className={`soft-card flex min-h-full flex-col rounded-2xl p-4 ${paid ? "border-emerald-300/35 shadow-[0_0_30px_rgba(34,197,94,0.12)]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 ${paid ? "bg-emerald-400 text-black" : "bg-black/35 text-yellow-300"}`}>
                    {paid ? <Sparkles size={25} /> : <CheckCircle2 size={25} />}
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-white">{plan.name}</h2>
                    <p className="mt-1 text-sm text-neutral-400">{plan.durationMonths} meses de validade</p>
                  </div>
                </div>
                <span className={paid ? "inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-xs font-black uppercase text-emerald-200" : "rounded-full border border-white/10 px-3 py-1 text-xs font-black text-neutral-300"}>
                  {paid ? <Tag size={13} /> : null}
                  {plan.maxCategories} atividades
                </span>
              </div>

              <div className={`mt-5 rounded-2xl border p-3 ${paid ? "border-emerald-300/35 bg-emerald-400/10" : "border-yellow-300/25 bg-yellow-300/10"}`}>
                <p className={`text-4xl font-black ${paid ? "text-emerald-300" : "text-yellow-300"}`}>
                  {paid ? formatCurrencyBRL(plan.priceCents) : "Grátis"}
                </p>
                <p className="mt-1 text-xs font-bold text-neutral-200">{plan.description}</p>
              </div>

              <ul className="mt-5 grid gap-2 text-sm text-neutral-200">
                <li className="flex gap-2">
                  <CheckCircle2 className={paid ? "mt-0.5 shrink-0 text-emerald-300" : "mt-0.5 shrink-0 text-yellow-300"} size={16} />
                  <span>Até {plan.maxCategories} atividades profissionais</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className={paid ? "mt-0.5 shrink-0 text-emerald-300" : "mt-0.5 shrink-0 text-yellow-300"} size={16} />
                  <span>Até {plan.imageLimit} imagem{plan.imageLimit === 1 ? "" : "s"} no cadastro</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className={paid ? "mt-0.5 shrink-0 text-emerald-300" : "mt-0.5 shrink-0 text-yellow-300"} size={16} />
                  <span>Aparece nas buscas de Empresas e Serviços</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className={paid ? "mt-0.5 shrink-0 text-emerald-300" : "mt-0.5 shrink-0 text-yellow-300"} size={16} />
                  <span>{paid ? "Pagamento via PIX com ativação automática" : "Sem pagamento para começar"}</span>
                </li>
              </ul>

              <div className="mt-auto pt-5">
                <Link href={`/servicos/anunciar?servicePlan=${plan.code}`} className={paid ? "inline-flex h-11 w-full items-center justify-center rounded-full bg-[#22C55E] px-4 text-sm font-black text-black shadow-[0_0_18px_rgba(34,197,94,0.2)] hover:bg-[#34D399]" : "inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm btn-gold"}>
                  {paid ? "Escolher Plano" : "Começar Grátis"}
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
