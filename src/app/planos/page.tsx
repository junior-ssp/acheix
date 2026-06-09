import Link from "next/link";
import { Car, CheckCircle2, HomeIcon } from "lucide-react";
import { PlanIcon } from "@/components/plan-icon";
import { planCatalog } from "@/lib/constants";
import { formatPlanCurrencyBRL } from "@/lib/formatters";
import { withTimeout } from "@/lib/async";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

type PublicPlan = {
  id?: string;
  code: string;
  name: string;
  priceCents: number;
  originalPriceCents: number | null;
  durationDays: number;
  photoLimit: number;
  listingLimit: number;
  benefits: readonly string[];
  active?: boolean;
};

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-4 sm:p-6">
        <h1 className="text-3xl font-black">Planos</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-200 sm:text-base">
          Escolha por quantos dias seu anúncio vai ficar no ar. Quando acabar, você pode renovar.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.code} className="soft-card flex min-h-full flex-col rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-black/35">
                  <PlanIcon code={plan.code} size={25} />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-white">{plan.name}</h2>
                  <p className="mt-1 text-sm text-neutral-400">{plan.durationDays} dias de validade</p>
                </div>
              </div>
              <span className={plan.code === "GOLD" ? "rounded-full px-3 py-1 text-xs btn-gold" : "rounded-full border border-white/10 px-3 py-1 text-xs font-black text-neutral-300"}>
                {plan.listingLimit > 1 ? `${plan.listingLimit} anúncios` : `${plan.photoLimit} fotos`}
              </span>
            </div>

            <p className="mt-5 text-3xl font-black text-yellow-300">
              {plan.priceCents ? money(plan.priceCents) : "Grátis"}
            </p>
            {plan.originalPriceCents ? (
              <p className="mt-1 text-sm font-black text-neutral-300">
                De <span className="line-through text-neutral-500">{money(plan.originalPriceCents)}</span> por {money(plan.priceCents)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-neutral-400">{plan.listingLimit > 1 ? "pacote para veículos ou imóveis" : "por anúncio publicado"}</p>

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

            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <Link href={`/anunciar?category=VEHICLE&planCode=${plan.code}`} className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-center text-xs font-black leading-tight btn-gold sm:px-3 sm:text-sm">
                <Car size={16} strokeWidth={2.6} />
                Anunciar Veículo
              </Link>
              <Link href={`/anunciar?category=REAL_ESTATE&planCode=${plan.code}`} className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#22C55E] px-2 text-center text-xs font-black leading-tight text-black shadow-[0_0_18px_rgba(34,197,94,0.2)] hover:bg-[#34D399] sm:px-3 sm:text-sm">
                <HomeIcon size={16} strokeWidth={2.6} />
                Anunciar Imóvel
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function money(cents: number) {
  return formatPlanCurrencyBRL(cents);
}

async function getPlans(): Promise<readonly PublicPlan[]> {
  const existing = await withTimeout(
    (async () => {
      const { data, error } = await db().from("Plan").select("*").eq("active", true).order("priceCents", { ascending: true });
      throwDbError(error);
      return data ?? [];
    })(),
    [],
    1200
  );
  const catalogByCode = new Map(planCatalog.map((plan) => [plan.code, plan]));
  return existing.length
    ? existing.map((plan: any): PublicPlan => {
        const catalogPlan = catalogByCode.get(plan.code);
        return catalogPlan ? { ...plan, ...catalogPlan, id: plan.id, active: plan.active } : plan;
      })
    : planCatalog;
}
