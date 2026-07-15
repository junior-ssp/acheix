import Link from "next/link";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { PlanIcon } from "@/components/plan-icon";
import { planCatalog } from "@/lib/constants";
import { formatPlanCurrencyBRL } from "@/lib/formatters";
import { getTopRefreshBenefitLabel } from "@/lib/listing-top-refresh-policy";
import { isPlanAllowedForCategory } from "@/lib/plan-rules";
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
      <section className="grid gap-3 py-4 text-white">
        <p className="text-xs font-black uppercase tracking-wide text-yellow-300">Volta ao Topo automático</p>
        <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl">Aqui seu anúncio Não Desaparece</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-300 sm:text-base">
          No <strong>Achei X</strong>, todos os Planos (inclusive o Grátis) <strong>VOLTAM AO TOPO</strong> automaticamente pelo menos uma vez por semana, até o final do Plano ou enquanto ele existir.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.code} className={`soft-card flex min-h-full flex-col rounded-2xl border-2 p-4 shadow-lg ${planCardStyle(plan.code)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-black/35 ${planIconFrameStyle(plan.code)}`}>
                  <PlanIcon code={plan.code} size={25} />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-white">{plan.name}</h2>
                  <p className="mt-1 text-sm text-neutral-400">{validityLabel(plan)}</p>
                </div>
              </div>
              <span className="rounded-full px-3 py-1 text-xs btn-gold">
                {plan.code === "FREE" ? (
                  "10 fotos"
                ) : plan.listingLimit > 1 ? (
                  `${plan.listingLimit} anúncios`
                ) : (
                  `${plan.photoLimit} fotos`
                )}
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
            <p className="mt-1 text-xs text-neutral-400">{isPlanAllowedForCategory(plan.code, "VEHICLE") ? (plan.listingLimit > 1 ? "pacote para veículos ou imóveis" : "por anúncio publicado") : "Válido só para a Categoria PRODUTOS"}</p>

            <div className="mt-4 text-yellow-200">
              <div className="flex items-start gap-2">
                <RefreshCw className="mt-0.5 shrink-0 text-yellow-300" size={17} strokeWidth={2.6} />
                <div>
                  <p className="text-xs font-black uppercase text-yellow-300">Volta ao Topo</p>
                  <p className="mt-1 text-sm font-bold">{topRefreshShortLabel(plan.code)}</p>
                </div>
              </div>
            </div>

            <ul className="mt-5 grid gap-2 text-sm text-neutral-200">
              {safeBenefits(plan).map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-yellow-300" size={16} />
                  <span>{benefit}</span>
                </li>
              ))}
              {plan.code === "FREE" ? (
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-yellow-300" size={16} />
                  <span>Cooldown: 1 anúncio grátis por categoria a cada {plan.durationDays} dias</span>
                </li>
              ) : null}
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-yellow-300" size={16} />
                <span>Quando vencer, renove para continuar aparecendo.</span>
              </li>
            </ul>

            <div className="mt-auto pt-5">
              <Link href={`/anunciar?planCode=${plan.code}`} className="inline-flex h-11 w-full min-w-0 items-center justify-center rounded-full px-4 text-center text-sm font-black btn-gold">
                Escolher este Plano
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

function topRefreshShortLabel(planCode: string) {
  const label = getTopRefreshBenefitLabel(planCode)
    .replace(/^Volta ao topo /i, "")
    .replace(/^diariamente, com limites de diversidade$/i, "Diariamente");
  return `${label}, até o final do seu Plano ou até excluir o anúncio`;
}

function validityLabel(plan: Pick<PublicPlan, "durationDays">) {
  return `${plan.durationDays} dias de validade`;
}

function planCardStyle(code: string) {
  if (code === "FREE") return "border-emerald-400/70 shadow-emerald-500/10";
  if (code === "PRODUCT_MINI") return "border-sky-400/75 shadow-sky-500/20";
  if (code === "PRODUCT_START") return "border-emerald-400/75 shadow-emerald-500/20";
  if (code === "PRODUCT_BASIC") return "border-yellow-300/80 shadow-yellow-400/20";
  if (code === "BRONZE") return "border-orange-400/75 shadow-orange-500/20";
  if (code === "SILVER") return "border-slate-200/75 shadow-slate-200/10";
  if (code === "GOLD") return "border-yellow-300/90 shadow-yellow-400/20";
  if (code === "X6") return "border-cyan-300/75 shadow-cyan-400/20";
  if (code === "X12") return "border-fuchsia-300/75 shadow-fuchsia-400/20";
  return "border-white/15 shadow-black/20";
}

function planIconFrameStyle(code: string) {
  if (code === "FREE") return "border-emerald-400/45";
  if (code === "PRODUCT_MINI") return "border-sky-400/55";
  if (code === "PRODUCT_START") return "border-emerald-400/55";
  if (code === "PRODUCT_BASIC") return "border-yellow-300/60";
  if (code === "BRONZE") return "border-orange-400/55";
  if (code === "SILVER") return "border-slate-200/55";
  if (code === "GOLD") return "border-yellow-300/70";
  if (code === "X6") return "border-cyan-300/55";
  if (code === "X12") return "border-fuchsia-300/55";
  return "border-white/10";
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
  const existingCodes = new Set(existing.map((plan: any) => plan.code));
  const mergedExisting = existing.map((plan: any): PublicPlan => {
        const catalogPlan = catalogByCode.get(plan.code);
        return normalizePublicPlan(catalogPlan ? { ...catalogPlan, ...plan, id: plan.id, active: plan.active } : plan, catalogPlan);
      });
  const missingCatalogPlans = planCatalog.filter((plan) => !existingCodes.has(plan.code));
  return [...mergedExisting, ...missingCatalogPlans.map((plan) => normalizePublicPlan(plan, plan))].sort((a, b) => a.priceCents - b.priceCents);
}

function normalizePublicPlan(plan: any, fallback?: Partial<PublicPlan>): PublicPlan {
  return {
    id: typeof plan?.id === "string" ? plan.id : fallback?.id,
    code: String(plan?.code ?? fallback?.code ?? ""),
    name: String(plan?.name ?? fallback?.name ?? "Plano"),
    priceCents: safeNumber(plan?.priceCents, fallback?.priceCents ?? 0),
    originalPriceCents: plan?.originalPriceCents === null || plan?.originalPriceCents === undefined ? fallback?.originalPriceCents ?? null : safeNumber(plan.originalPriceCents, fallback?.originalPriceCents ?? 0),
    durationDays: safeNumber(plan?.durationDays, fallback?.durationDays ?? 30),
    photoLimit: safeNumber(plan?.photoLimit, fallback?.photoLimit ?? 1),
    listingLimit: safeNumber(plan?.listingLimit, fallback?.listingLimit ?? 1),
    benefits: Array.isArray(plan?.benefits) ? plan.benefits.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : Array.isArray(fallback?.benefits) ? fallback.benefits : [],
    active: typeof plan?.active === "boolean" ? plan.active : fallback?.active
  };
}

function safeBenefits(plan: Pick<PublicPlan, "benefits" | "durationDays" | "photoLimit" | "listingLimit">) {
  if (Array.isArray(plan.benefits) && plan.benefits.length) return plan.benefits;
  return [
    `${plan.durationDays} dias de validade`,
    `Até ${plan.photoLimit} fotos`,
    `${plan.listingLimit} anúncio${plan.listingLimit === 1 ? "" : "s"}`
  ];
}

function safeNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
