import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/formatters";
import { servicePlans } from "@/lib/service-plans";

export const dynamic = "force-dynamic";

export default function ServicePlansPage() {
  const free = servicePlans.SERVICE_FREE;
  const pro = servicePlans.SERVICE_PRO;
  const plans = [
    {
      code: free.code,
      name: free.name,
      price: "Grátis",
      detail: "6 meses de validade",
      badge: `${free.maxCategories} atividades`,
      description: "Plano inicial para aparecer nas buscas de serviços.",
      href: "/servicos/anunciar?servicePlan=SERVICE_FREE" as const,
      action: "Começar Grátis",
      icon: "free" as const,
      benefits: [
        `Até ${free.maxCategories} atividades profissionais`,
        "Perfil aparece nas buscas de serviços",
        "Contato protegido pelas regras do Achei X",
        "Sem foto, cartão ou banner neste momento"
      ]
    },
    {
      code: pro.code,
      name: pro.name,
      price: formatCurrencyBRL(pro.priceCents),
      detail: "12 meses de validade",
      badge: `${pro.maxCategories} atividades`,
      description: "Plano anual para profissional que quer mais atividades.",
      href: "/servicos/anunciar?servicePlan=SERVICE_PRO" as const,
      action: "Escolher Plano PRO",
      icon: "pro" as const,
      benefits: [
        `Até ${pro.maxCategories} atividades profissionais`,
        "Perfil aparece nas buscas de serviços",
        "Pagamento via PIX com ativação automática",
        "Sem foto, cartão ou banner neste momento"
      ]
    }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-4 sm:p-6">
        <p className="text-sm font-black uppercase text-yellow-300">Prestadores de Serviços</p>
        <h1 className="mt-2 text-3xl font-black">Escolha seu Plano</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-200 sm:text-base">
          Cadastre seu perfil profissional, escolha suas atividades e apareça nas buscas do Achei X.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.code} className="soft-card flex min-h-full flex-col rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-black/35 text-yellow-300">
                  {plan.icon === "pro" ? <Sparkles size={25} /> : <CheckCircle2 size={25} />}
                </span>
                <div>
                  <h2 className="text-2xl font-black text-white">{plan.name}</h2>
                  <p className="mt-1 text-sm text-neutral-400">{plan.detail}</p>
                </div>
              </div>
              <span className={plan.icon === "pro" ? "rounded-full px-3 py-1 text-xs btn-gold" : "rounded-full border border-white/10 px-3 py-1 text-xs font-black text-neutral-300"}>
                {plan.badge}
              </span>
            </div>

            <p className="mt-5 text-3xl font-black text-yellow-300">{plan.price}</p>
            <p className="mt-1 text-xs text-neutral-400">{plan.description}</p>

            <ul className="mt-5 grid gap-2 text-sm text-neutral-200">
              {plan.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-yellow-300" size={16} />
                  <span>{benefit}</span>
                </li>
              ))}
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-yellow-300" size={16} />
                <span>Quando vencer, renove para continuar aparecendo.</span>
              </li>
            </ul>

            <div className="mt-auto pt-5">
              <Link href={plan.href} className={plan.icon === "pro" ? "inline-flex h-11 w-full items-center justify-center rounded-full bg-[#22C55E] px-4 text-sm font-black text-black shadow-[0_0_18px_rgba(34,197,94,0.2)] hover:bg-[#34D399]" : "inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm btn-gold"}>
                {plan.action}
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
