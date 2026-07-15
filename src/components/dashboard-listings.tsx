"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Clock, MapPin, X } from "lucide-react";
import { daysUntil, pendingPaymentDraftDays } from "@/lib/expiration-policy";
import { planCatalog } from "@/lib/constants";
import { formatCurrencyBRL, formatPlanCurrencyBRL } from "@/lib/formatters";
import { normalizeImageUrl } from "@/lib/image-url";
import { PlanIcon } from "@/components/plan-icon";
import { isCnpjAccount, isPlanAllowedForCategory, isProductPlanAvailableForPrice, isProfessionalPlanCode } from "@/lib/plan-rules";

type DashboardListing = {
  id: string;
  slug: string;
  title: string;
  type: string;
  category: string;
  priceCents: number;
  city: string;
  state: string;
  status: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  viewCount: number;
  contactClickCount: number;
  shareCount: number;
  favoritesCount: number;
  leadsCount: number;
  pendingPaymentId?: string | null;
  pendingPaymentCreatedAt?: Date | string | null;
  plan: { code: string; name: string };
  photos: Array<{ url: string; alt: string | null }>;
};
type PlanOption = (typeof planCatalog)[number];

type PendingDowngrade = {
  listing: DashboardListing;
  plan: PlanOption;
};

const filters = [
  { label: "Todos", value: "ALL" },
  { label: "Pagamento pendente", value: "DRAFT" },
  { label: "Ativos", value: "ACTIVE" },
  { label: "Em análise", value: "PENDING_REVIEW" },
  { label: "Expirando", value: "EXPIRING" },
  { label: "Expirados", value: "EXPIRED" },
  { label: "Vendidos/Alugados", value: "SOLD_RENTED" },
];

export function DashboardListings({ listings, accountType, cnpj, initialFilter = "ALL", plans = planCatalog }: { listings: DashboardListing[]; accountType?: string | null; cnpj?: string | null; initialFilter?: string; plans?: readonly PlanOption[] }) {
  const [planOptions, setPlanOptions] = useState<readonly PlanOption[]>(plans);
  const paidPlans = planOptions.filter((plan) => plan.code !== "FREE" && (!isProfessionalPlanCode(plan.code) || isCnpjAccount({ accountType, cnpj })));
  const [items, setItems] = useState(listings);
  const [filter, setFilter] = useState(filters.some((item) => item.value === initialFilter) ? initialFilter : "ALL");
  const [message, setMessage] = useState("");
  const [showPendingPaymentNotice, setShowPendingPaymentNotice] = useState(false);
  const [renewingSlug, setRenewingSlug] = useState<string | null>(null);
  const [pendingDowngrade, setPendingDowngrade] = useState<PendingDowngrade | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const renewMenuRef = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    if (filter === "SOLD_RENTED") return items.filter((listing) => listing.status === "SOLD" || listing.status === "RENTED");
    if (filter === "EXPIRING") {
      const expiringLimit = Date.now() + 3 * 86400000;
      return items.filter((listing) => new Date(listing.expiresAt).getTime() <= expiringLimit);
    }
    return items.filter((listing) => listing.status === filter);
  }, [filter, items]);
  const currentFilter = filters.find((item) => item.value === filter) ?? filters[0];
  const pendingPaymentItems = useMemo(() => items.filter((listing) => listing.status === "DRAFT" && listing.pendingPaymentId), [items]);
  const filterCounts = useMemo(() => {
    const counts = new Map<string, number>(filters.map((item) => [item.value, 0]));
    const expiringLimit = Date.now() + 3 * 86400000;
    counts.set("ALL", items.length);
    for (const item of items) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
      if (new Date(item.expiresAt).getTime() <= expiringLimit) counts.set("EXPIRING", (counts.get("EXPIRING") ?? 0) + 1);
      if (item.status === "SOLD" || item.status === "RENTED") counts.set("SOLD_RENTED", (counts.get("SOLD_RENTED") ?? 0) + 1);
    }
    return counts;
  }, [items]);

  useEffect(() => {
    setItems(listings);
  }, [listings]);

  useEffect(() => {
    setShowPendingPaymentNotice(pendingPaymentItems.length > 0);
  }, [pendingPaymentItems.length]);

  useEffect(() => {
    if (window.location.hash !== "#meus-anuncios") return;
    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plans", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && Array.isArray(data?.plans)) setPlanOptions(data.plans);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!renewingSlug) return;
    function closeOnOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && renewMenuRef.current?.contains(target)) return;
      setRenewingSlug(null);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, [renewingSlug]);

  function goBackFromFilter() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setFilter("ALL");
  }

  function handleRenewClick(listing: DashboardListing, plan: PlanOption) {
    if (isPlanDowngrade(listing.plan.code, plan.code)) {
      setPendingDowngrade({ listing, plan });
      return;
    }
    renew(listing.slug, plan.code);
  }

  async function renew(slug: string, planCode: string, downgradeAccepted = false) {
    setMessage("");
    const response = await fetch(`/api/listings/${slug}/renew`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planCode, downgradeAccepted })
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setMessage(data?.error ?? "Não foi possível iniciar a renovação.");
    if (data?.requiresDowngradeAcceptance) {
      const listing = items.find((item) => item.slug === slug);
      const plan = paidPlans.find((item) => item.code === planCode);
      if (listing && plan) setPendingDowngrade({ listing, plan });
    }
  }

  async function remove(slug: string) {
    if (!window.confirm("Confirmar exclusão definitiva deste anúncio?")) return;
    const response = await fetch(`/api/listings/${slug}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.slug !== slug));
      setMessage("Anúncio excluído.");
      return;
    }
    setMessage("Não foi possível excluir.");
  }

  return (
    <section ref={sectionRef} id="meus-anuncios" className="mt-8 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Meus Anúncios</h2>
          <p className="mt-1 text-sm text-neutral-400">Acompanhe status, vencimento, interesse e desempenho.</p>
        </div>
        <a href="/planos" className="rounded-full px-4 py-2 text-sm btn-gold">Criar anúncio</a>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-2">
        {filters.map((item) => (
          <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-black leading-none transition ${filter === item.value ? "btn-gold" : "border border-white/10 bg-black text-white hover:border-yellow-300/40"}`}>
            {item.label} <span className="ml-1 opacity-70">{filterCounts.get(item.value) ?? 0}</span>
          </button>
        ))}
      </div>
      {filter !== "ALL" ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
          <div>
            <p className="text-xs font-black uppercase text-yellow-300">{currentFilter.label}</p>
            <p className="text-xs text-neutral-400">{filtered.length} anúncio(s) nesta lista.</p>
          </div>
          <button type="button" onClick={goBackFromFilter} className="inline-flex h-8 items-center gap-1 rounded-full border border-white/10 px-3 text-xs font-black text-white hover:border-yellow-300/40">
            <ArrowLeft size={14} />
            Voltar
          </button>
        </div>
      ) : null}
      {message && <p className="mt-3 text-sm text-yellow-300">{message}</p>}
      {pendingPaymentItems.length ? (
        <div className="mt-3 rounded-xl border border-yellow-300/35 bg-yellow-300/10 p-3 text-sm text-yellow-50">
          <p className="font-black">Pagamento pendente</p>
          <p className="mt-1 text-yellow-100/90">
            Anúncios não pagos ficam disponíveis para pagamento por {pendingPaymentDraftDays} dias. Depois disso, são removidos automaticamente.
          </p>
        </div>
      ) : null}
      <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
        <div className="hidden grid-cols-[minmax(260px,1fr)_110px_130px_190px_190px] border-b border-black/10 p-3 text-sm font-bold dark:border-white/10 lg:grid">
          <span>Anúncio</span><span>Status</span><span>Vencimento</span><span>Indicadores</span><span>Ações</span>
        </div>
        {filtered.map((listing) => {
          const remaining = daysUntil(new Date(listing.expiresAt));
          return (
            <div key={listing.id} className="grid gap-3 border-b border-black/5 p-3 text-sm last:border-0 dark:border-white/5 lg:grid-cols-[minmax(260px,1fr)_110px_130px_190px_190px] lg:items-center">
              <span>
                <ListingMini listing={listing} remaining={remaining} />
                <small className="text-neutral-500">Publicado em {new Date(listing.createdAt).toLocaleDateString("pt-BR")}</small>
              </span>
              <span><b className="lg:hidden">Status: </b>{translateStatus(listing.status)}</span>
              <span><b className="lg:hidden">Vencimento: </b>{new Date(listing.expiresAt).toLocaleDateString("pt-BR")}<br /><small>{listing.status === "DRAFT" ? (remaining > 0 ? `Pagar em até ${remaining} dias` : "Pendente vencido") : remaining > 0 ? `${remaining} dias` : "Expirado"}</small></span>
              <span className="grid grid-cols-3 gap-1 text-center text-[11px]">
                <Metric label="Visualizações" value={listing.viewCount} />
                <Metric label="Cliques" value={listing.contactClickCount} />
                <Metric label="Mensagens" value={listing.leadsCount} />
                <Metric label="Favoritos" value={listing.favoritesCount} />
                <Metric label="Compart." value={listing.shareCount} />
                <Metric label="Dias" value={Math.max(remaining, 0)} />
              </span>
              <span className="grid gap-2">
                {listing.status === "DRAFT" && listing.pendingPaymentId ? (
                  <a href={`/pagamento?paymentId=${listing.pendingPaymentId}`} className="rounded-md bg-[#22C55E] px-3 py-2 text-center font-black text-black hover:bg-[#34D399]">Pagar</a>
                ) : null}
                <a href={`/dashboard/anuncios/${listing.slug}/editar`} className="rounded-md border border-emerald-400/30 px-3 py-2 font-bold text-emerald-200 hover:bg-[#22C55E]/10">Editar</a>
                {listing.status !== "DRAFT" ? (
                  <div ref={renewingSlug === listing.slug ? renewMenuRef : null} className="grid gap-2">
                    <button type="button" onClick={() => setRenewingSlug((current) => current === listing.slug ? null : listing.slug)} className="rounded-md px-3 py-2 btn-gold">
                      {remaining > 7 ? "Ver Renovação" : "Renovar Plano"}
                    </button>
                    {renewingSlug === listing.slug && (
                      <div className="grid gap-1 rounded-md border border-yellow-300/25 bg-yellow-300/10 p-2">
                      {paidPlans.filter((plan) => isPlanAllowedForCategory(plan.code, listing.category as any) && (listing.category !== "PRODUCT" || isProductPlanAvailableForPrice(plan.code, listing.priceCents))).map((plan) => (
                        <button key={plan.code} type="button" onClick={() => handleRenewClick(listing, plan)} className="rounded-md border border-white/10 px-2 py-1.5 text-left text-xs font-black text-white hover:border-yellow-300/50">
                          {plan.name} - {formatPlanCurrencyBRL(plan.priceCents)}
                        </button>
                      ))}
                      </div>
                    )}
                  </div>
                ) : null}
                <button type="button" onClick={() => remove(listing.slug)} className="rounded-md border border-red-400/30 px-3 py-2 font-bold text-red-200">Excluir</button>
              </span>
            </div>
          );
        })}
        {!filtered.length && <p className="p-4 text-sm text-neutral-500">Nenhum anúncio neste filtro.</p>}
      </div>
      {pendingDowngrade ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-yellow-300/30 bg-neutral-950 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow-300/15 text-yellow-300">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h3 className="text-lg font-black text-white">Confirmar troca para plano inferior</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                  Este anúncio está no plano {pendingDowngrade.listing.plan.name} e você escolheu o plano {pendingDowngrade.plan.name}. Após o pagamento confirmado, o anúncio passará a seguir os limites e o prazo do novo plano escolhido.
                </p>
                <p className="mt-2 text-sm font-bold text-yellow-100">
                  Essa troca é permitida, mas precisa da sua confirmação.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setPendingDowngrade(null)} className="h-11 rounded-full border border-white/10 px-4 text-sm font-black text-white hover:border-yellow-300/50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = pendingDowngrade;
                  setPendingDowngrade(null);
                  renew(current.listing.slug, current.plan.code, true);
                }}
                className="h-11 rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showPendingPaymentNotice && pendingPaymentItems.length ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-yellow-300/35 bg-neutral-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-yellow-300">Aviso importante</p>
                <h3 className="mt-1 text-xl font-black text-white">Você tem Pagamento Pendente !!!</h3>
              </div>
              <button type="button" onClick={() => setShowPendingPaymentNotice(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white hover:border-yellow-300/50" aria-label="Fechar aviso">
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">
              Se sair da tela de pagamento, você pode voltar por aqui em <strong className="text-yellow-200">Meus Anúncios</strong> e tocar em <strong className="text-yellow-200">Pagar</strong>. Anúncios não pagos são apagados automaticamente após {pendingPaymentDraftDays} dias.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setShowPendingPaymentNotice(false)} className="h-11 rounded-full border border-white/10 px-4 text-sm font-black text-white hover:border-yellow-300/50">
                Entendi
              </button>
              <a href={`/pagamento?paymentId=${pendingPaymentItems[0].pendingPaymentId}`} className="inline-flex h-11 items-center justify-center rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]">
                Pagar
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function isPlanDowngrade(currentCode: string, nextCode: string) {
  return planRank(nextCode) < planRank(currentCode);
}

function planRank(code: string) {
  const ranks: Record<string, number> = {
    FREE: 0,
    PRODUCT_MINI: 1,
    PRODUCT_START: 2,
    PRODUCT_BASIC: 3,
    BRONZE: 4,
    SILVER: 5,
    GOLD: 6,
    X6: 7,
    X12: 8
  };
  return ranks[code] ?? 0;
}

function ListingMini({ listing, remaining }: { listing: DashboardListing; remaining: number }) {
  const photo = listing.photos[0];
  const photoUrl = normalizeImageUrl(photo?.url);
  const planClassName = listing.plan.code === "FREE" ? "text-emerald-400" : "text-yellow-300";
  return (
    <div className="flex min-w-0 gap-3">
      <a href={`/anuncios/${listing.slug}`} aria-label={`Abrir anúncio ${listing.title}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
        {photo ? (
          <Image src={photoUrl} alt={photo.alt ?? listing.title} fill sizes="96px" quality={76} className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-[10px] font-bold text-neutral-400">Sem foto</div>
        )}
      </a>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <a href={`/anuncios/${listing.slug}`} className="min-w-0 line-clamp-2 text-sm font-bold hover:text-yellow-300">{listing.title}</a>
          <div className="shrink-0 rounded-lg border border-yellow-300/20 bg-black/75 px-2 py-1 text-[9px] font-black text-white">
            <span className="flex items-center justify-end gap-1">
              <PlanIcon code={listing.plan.code} name={listing.plan.name} size={10} />
              <span className={planClassName}>{listing.plan.name}</span>
            </span>
            <span className="mt-0.5 flex items-center justify-end gap-1">
              <Clock size={10} className="text-yellow-300" />
              <span>{remaining > 0 ? `${remaining} dias` : "Expirado"}</span>
            </span>
          </div>
        </div>
        <p className="mt-1 font-black text-yellow-300">{formatCurrencyBRL(listing.priceCents)}</p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-neutral-400">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{listing.city}, {listing.state}</span>
        </p>
        <span className="mt-1 inline-flex rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold text-yellow-300">{listing.type}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md border border-white/10 bg-black/35 px-1.5 py-1">
      <b className="block text-yellow-300">{value}</b>
      <span className="text-neutral-400">{label}</span>
    </span>
  );
}

function translateStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Pagamento pendente",
    PENDING_REVIEW: "Em análise",
    ACTIVE: "Ativo",
    REJECTED: "Rejeitado",
    EXPIRED: "Expirado",
    SOLD: "Vendido",
    RENTED: "Alugado"
  };
  return labels[status] ?? status;
}
