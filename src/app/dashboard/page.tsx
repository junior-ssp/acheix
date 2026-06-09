import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withTimeout } from "@/lib/async";
import { hydrateListings, listingColumns } from "@/lib/listing-records";
import { db, throwDbError } from "@/lib/supabase-db";
import { NotificationPreferences } from "@/components/notification-preferences";
import { DashboardListings } from "@/components/dashboard-listings";
import { DashboardLeads } from "@/components/dashboard-leads";
import { ProfileForm } from "@/components/profile-form";
import { ServiceProfileActivityPanel } from "@/components/service-profile-activity-panel";
import { ServiceProfileActions } from "@/components/service-profile-actions";
import { LogoutButton } from "@/components/logout-button";
import { calculateResponseMetrics, formatAverageResponse, responseTierLabel } from "@/lib/response-metrics";
import { defaultServiceCategories } from "@/lib/service-catalog";
import { serviceBillingSummary } from "@/lib/service-billing-policy";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatCurrencyBRL } from "@/lib/formatters";
import { parsePublishProviderRef, parseRenewProviderRef } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams?: { meus?: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");
  const requestedListingFilter = ["DRAFT", "ACTIVE", "PENDING_REVIEW", "EXPIRING", "EXPIRED", "SOLD_RENTED"].includes(searchParams?.meus ?? "") ? searchParams?.meus ?? "ALL" : "ALL";
  const supabase = getSupabaseAdmin();
  const [listings, payments, serviceProfileResult, leadsResult] = await Promise.all([
    findDashboardListings(user.id),
    findDashboardPayments(user.id),
    supabase
      .from("service_profiles")
      .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,status,active,cidade,bairro,estado,last_active_at,activity_confirmation_due_at,complemento")
      .eq("user_id", user.id)
      .maybeSingle(),
    withTimeout(findDashboardLeads(user.id), [[], [], []] as const, 1800)
  ]);
  const serviceProfile = serviceProfileResult.data;
  const serviceBilling = serviceProfile?.status !== "CLOSED" ? serviceBillingSummary(serviceProfile?.complemento) : null;
  const [receivedLeads, sentLeads, ownerLeadsForMetrics] = leadsResult;
  const responseMetrics = calculateResponseMetrics(ownerLeadsForMetrics);
  const responseScore = responseMetrics.score === null ? null : Math.round(responseMetrics.score / 10);
  const metrics = [
    { label: "Ativos", value: listings.filter((item) => item.status === "ACTIVE").length, href: "/dashboard?meus=ACTIVE#meus-anuncios" },
    { label: "Pagamentos Pendentes", value: listings.filter((item) => item.status === "DRAFT").length, href: "/dashboard?meus=DRAFT#meus-anuncios" },
    { label: "Em Análise", value: listings.filter((item) => item.status === "PENDING_REVIEW").length, href: "/dashboard?meus=PENDING_REVIEW#meus-anuncios" },
    { label: "Expirando", value: listings.filter((item) => item.expiresAt <= new Date(Date.now() + 3 * 86400000)).length, href: "/dashboard?meus=EXPIRING#meus-anuncios" },
    { label: "Expirados", value: listings.filter((item) => item.status === "EXPIRED").length, href: "/dashboard?meus=EXPIRED#meus-anuncios" },
    { label: "Vendidos/Alugados", value: listings.filter((item) => item.status === "SOLD" || item.status === "RENTED").length, href: "/dashboard?meus=SOLD_RENTED#meus-anuncios" },
    { label: "Serviços Publicados", value: serviceProfile && serviceProfile.status !== "CLOSED" ? 1 : 0, href: "/dashboard#meus-servicos" },
    { label: "Visualizações", value: listings.reduce((sum, item) => sum + item.viewCount, 0), href: "/dashboard#meus-anuncios" },
    { label: "Cliques", value: listings.reduce((sum, item) => sum + item.contactClickCount, 0), href: "/dashboard#meus-anuncios" },
    { label: "Compartilhamentos", value: listings.reduce((sum, item) => sum + item.shareCount, 0), href: "/dashboard#meus-anuncios" },
    { label: "Interesses", value: receivedLeads.length, href: "/dashboard#interesses" },
    { label: "Nota de Atendimento", value: responseScore ?? 0, href: "/dashboard#performance" },
    { label: "Taxa de Resposta", value: `${responseMetrics.responseRate ?? 0}%`, href: "/dashboard#performance" },
    { label: "Favoritos", value: listings.reduce((sum, item: any) => sum + (item._count?.favorites ?? 0), 0), href: "/favoritos" }
  ];
  const profileFields = [user.phone, user.whatsapp, user.cep, user.address, user.number, user.district, user.city, user.state];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-black sm:text-3xl">Minha Conta</h1>
        <LogoutButton className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 px-2.5 text-xs font-black text-white hover:bg-white/10 disabled:opacity-60 sm:px-4 sm:text-sm" label="Sair / Trocar Login" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link href="/planos" className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">Novo Anúncio</Link>
        <Link href="/dashboard?meus=ALL#meus-anuncios" className="inline-flex h-11 items-center justify-center rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]">Meus Anúncios</Link>
        <Link href="/dashboard#interesses" className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">Interesses</Link>
        <Link href="/favoritos" className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">Favoritos</Link>
        <Link href="/servicos" className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">Buscar serviços</Link>
        <Link href="/servicos/anunciar" className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">Sou prestador</Link>
      </div>
      <div id="performance" className="mt-6 grid scroll-mt-24 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => {
          const content = (
            <>
              <p className="text-xs font-black text-neutral-500">{metric.label}</p>
              <strong className="mt-1 block text-xl">{metric.value}</strong>
            </>
          );
          const className = "rounded-md border border-black/10 bg-white p-2 text-left transition dark:border-white/10 dark:bg-neutral-900";
          return metric.href ? (
            <Link key={metric.label} href={metric.href as any} className={`${className} hover:border-yellow-300/50`}>
              {content}
            </Link>
          ) : (
            <div key={metric.label} className={className}>
              {content}
            </div>
          );
        })}
      </div>
      <section className={`mt-4 rounded-lg border p-4 ${responseMetrics.badgeClassName}`}>
        <p className="text-xs font-black uppercase">Velocidade de Resposta</p>
        <strong className="mt-1 block text-xl">{responseMetrics.label} - {formatAverageResponse(responseMetrics.averageResponseMinutes)}</strong>
        <p className="mt-1 text-sm">
          {responseTierLabel(responseMetrics.tier)} · Responde {responseMetrics.responseRate ?? 0}% · Nota {responseScore ?? "novo"}/10.
          Responda os interessados para melhorar.
        </p>
      </section>
      <div id="perfil" className="scroll-mt-24">
      <ProfileForm profileCompletion={profileCompletion} user={{
        name: user.name,
        username: user.username,
        cpf: user.cpf,
        phone: user.phone,
        whatsapp: user.whatsapp,
        cep: user.cep,
        address: user.address,
        number: user.number,
        complement: user.complement,
        district: user.district,
        city: user.city,
        state: user.state,
        accountType: user.accountType,
        cnpj: user.cnpj
      }} />
      </div>
      <NotificationPreferences initialChannels={user.notificationChannels?.length ? user.notificationChannels : [user.notificationChannel ?? "IN_APP"]} />
      {serviceProfile && serviceProfile.status !== "CLOSED" ? (
        <ServiceProfileActivityPanel
          initialStatus={serviceProfile.status}
          initialLastActiveAt={serviceProfile.last_active_at}
          initialDueAt={serviceProfile.activity_confirmation_due_at}
          billingSummary={serviceBilling ? {
            status: serviceBilling.billing.status,
            currentPeriodEndsAt: serviceBilling.billing.currentPeriodEndsAt,
            graceEndsAt: serviceBilling.billing.graceEndsAt,
            renewalPriceCents: serviceBilling.billing.renewalPriceCents
          } : null}
        />
      ) : null}
      <section id="meus-servicos" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-yellow-300">Serviços</p>
            <h2 className="mt-1 text-xl font-black">Meus Serviços</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Aqui ficam seus serviços publicados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/servicos" className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">Ver Serviços</Link>
            <Link href="/servicos/anunciar" className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm btn-gold">Publicar Serviço</Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {serviceProfile && serviceProfile.status !== "CLOSED" ? (
            <article className="rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{serviceProfile.nome_fantasia ?? serviceProfile.name ?? serviceCategoryName(serviceProfile.categoria_servico)}</h3>
                  <p className="mt-1 text-xs font-bold uppercase text-yellow-300">{serviceProfile.tipo_cadastro === "COMPANY" ? "Empresa Prestadora" : "Profissional Autônomo"}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-black ${serviceProfile.active ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}`}>
                  {serviceProfile.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-300">{serviceProfile.cidade}/{serviceProfile.estado}{serviceProfile.bairro ? ` - ${serviceProfile.bairro}` : ""}</p>
              {serviceBilling ? (
                <p className="mt-2 text-sm text-neutral-300">
                  {serviceBilling.billing.status === "TRIALING" ? "Gratis ate" : "Renovacao ate"} {new Date(serviceBilling.billing.currentPeriodEndsAt).toLocaleDateString("pt-BR")} - R$ {(serviceBilling.billing.renewalPriceCents / 100).toFixed(2).replace(".", ",")} por 6 meses - tolerancia ate {new Date(serviceBilling.billing.graceEndsAt).toLocaleDateString("pt-BR")}.
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(serviceProfile.categorias_servico?.length ? serviceProfile.categorias_servico : [serviceProfile.categoria_servico]).map((item: string) => (
                  <span key={item} className="rounded-full border border-white/10 px-2 py-1 text-xs text-neutral-200">{serviceCategoryName(item)}</span>
                ))}
              </div>
              <ServiceProfileActions />
            </article>
          ) : null}
          {!serviceProfile || serviceProfile.status === "CLOSED" ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-black/25 p-4 text-sm text-neutral-300 md:col-span-2">
              Você ainda não publicou serviços. Ative a opção <strong className="text-yellow-300">Sou Prestador de Serviços</strong> para cadastrar até 5 especialidades.
            </div>
          ) : null}
        </div>
      </section>
      <DashboardLeads
        ownerName={user.name}
        received={receivedLeads.map((lead) => ({
          id: lead.id,
          interestedUserId: lead.interestedUserId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          question1: lead.question1,
          question2: lead.question2,
          question3: lead.question3,
          status: lead.status,
          createdAt: new Date(lead.createdAt).toISOString(),
          listing: { title: lead.listing.title, slug: lead.listing.slug, category: lead.listing.category, type: lead.listing.type }
        }))}
        sent={sentLeads.map((lead) => ({
          id: lead.id,
          status: lead.status,
          readAt: lead.readAt ? new Date(lead.readAt).toISOString() : null,
          createdAt: new Date(lead.createdAt).toISOString(),
          listing: { title: lead.listing.title, slug: lead.listing.slug, category: lead.listing.category, type: lead.listing.type }
        }))}
      />
      <DashboardPayments payments={payments} />
      <DashboardListings initialFilter={requestedListingFilter} accountType={user.accountType} cnpj={user.cnpj} listings={listings.map((listing) => ({
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        type: listing.type,
        category: listing.category,
        priceCents: listing.priceCents,
        city: listing.city,
        state: listing.state,
        status: listing.status,
        createdAt: new Date(listing.createdAt).toISOString(),
        expiresAt: new Date(listing.expiresAt).toISOString(),
        viewCount: listing.viewCount,
        contactClickCount: listing.contactClickCount,
        shareCount: listing.shareCount,
        favoritesCount: listing._count.favorites,
        leadsCount: listing._count.contactLeads,
        plan: { code: listing.plan?.code ?? "FREE", name: listing.plan?.name ?? "Grátis" },
        photos: listing.photos.map((photo) => ({ url: photo.url, alt: photo.alt }))
      }))} />
    </main>
  );
}

type DashboardPayment = {
  id: string;
  amountCents: number;
  status: string;
  providerRef: string | null;
  createdAt: string;
  updatedAt: string | null;
  listing: { title: string; slug: string } | null;
  kind: "publish" | "renew" | "payment";
  planCode: string | null;
};

function DashboardPayments({ payments }: { payments: DashboardPayment[] }) {
  return (
    <section id="meus-pagamentos" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Financeiro</p>
          <h2 className="mt-1 text-xl font-black">Meus Pagamentos</h2>
          <p className="mt-1 text-sm text-neutral-400">Acompanhe PIX pendente, pagamentos feitos e compras de planos.</p>
        </div>
        <Link href="/planos" className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm btn-gold">Comprar Plano</Link>
      </div>
      <div className="mt-4 grid gap-3">
        {payments.map((payment) => (
          <article key={payment.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{payment.listing?.title ?? paymentTitle(payment)}</h3>
                <p className="mt-1 text-xs font-bold uppercase text-neutral-400">
                  {payment.kind === "renew" ? "Renovação" : payment.kind === "publish" ? "Publicação" : "Pagamento"} · {payment.planCode ?? "Plano"}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-black ${paymentStatusClass(payment.status)}`}>
                {paymentStatusLabel(payment.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-300">
              {formatCurrencyBRL(payment.amountCents)} · Criado em {new Date(payment.createdAt).toLocaleDateString("pt-BR")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {payment.status === "PENDING" ? (
                <Link href={`/pagamento/pix?paymentId=${payment.id}&novo=1`} className="inline-flex h-10 items-center justify-center rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]">
                  Pagar PIX
                </Link>
              ) : null}
              {payment.listing?.slug ? (
                <Link href={`/anuncios/${payment.listing.slug}`} className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">
                  Ver anúncio
                </Link>
              ) : null}
            </div>
          </article>
        ))}
        {!payments.length ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-black/25 p-4 text-sm text-neutral-300">
            Você ainda não tem pagamentos registrados.
          </div>
        ) : null}
      </div>
    </section>
  );
}

async function findDashboardListings(ownerId: string) {
  const { data, error } = await db()
    .from("Listing")
    .select(listingColumns())
    .eq("ownerId", ownerId)
    .order("createdAt", { ascending: false });
  throwDbError(error);
  const hydrated = await hydrateListings((data ?? []) as any[]);
  const listingIds = hydrated.map((listing) => listing.id);
  const [favoriteRows, leadRows] = await Promise.all([
    listingIds.length ? db().from("Favorite").select("listingId").in("listingId", listingIds) : Promise.resolve({ data: [], error: null }),
    listingIds.length ? db().from("ContactLead").select("listingId").in("listingId", listingIds) : Promise.resolve({ data: [], error: null })
  ]);
  throwDbError(favoriteRows.error);
  throwDbError(leadRows.error);
  const favorites = countByListing(favoriteRows.data ?? []);
  const leads = countByListing(leadRows.data ?? []);
  return hydrated.map((listing) => ({
    ...listing,
    photos: listing.photos.slice(0, 1),
    _count: { favorites: favorites.get(listing.id) ?? 0, contactLeads: leads.get(listing.id) ?? 0 }
  }));
}

async function findDashboardPayments(userId: string): Promise<DashboardPayment[]> {
  const { data, error } = await db()
    .from("Payment")
    .select("id,amountCents,status,providerRef,createdAt,updatedAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(20);
  throwDbError(error);

  const rows = (data ?? []) as Array<{
    id: string;
    amountCents: number;
    status: string;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string | null;
  }>;
  const parsed = rows.map((payment) => {
    const publish = parsePublishProviderRef(payment.providerRef);
    const renew = parseRenewProviderRef(payment.providerRef);
    const reference = publish ?? renew;
    return {
      payment,
      listingId: reference?.listingId ?? null,
      planCode: reference?.planCode ?? null,
      kind: publish ? "publish" as const : renew ? "renew" as const : "payment" as const
    };
  });
  const listingIds = [...new Set(parsed.map((item) => item.listingId).filter((id): id is string => Boolean(id)))];
  const { data: listings, error: listingsError } = listingIds.length
    ? await db().from("Listing").select("id,title,slug").in("id", listingIds)
    : { data: [], error: null };
  throwDbError(listingsError);
  const listingById = new Map((listings ?? []).map((listing: any) => [listing.id, { title: listing.title, slug: listing.slug }]));

  return parsed.map(({ payment, listingId, planCode, kind }) => ({
    ...payment,
    listing: listingId ? listingById.get(listingId) ?? null : null,
    kind,
    planCode
  }));
}

async function findDashboardLeads(ownerId: string) {
  const { data: listings, error } = await db().from("Listing").select("id,title,slug,category,type").eq("ownerId", ownerId);
  throwDbError(error);
  const listingRows = (listings ?? []) as Array<{ id: string; title: string; slug: string; category: string; type: string }>;
  const listingById = new Map(listingRows.map((listing) => [listing.id, listing]));
  const listingIds = [...listingById.keys()];
  const [receivedResult, sentResult, metricsResult] = await Promise.all([
    listingIds.length ? db().from("ContactLead").select("*").in("listingId", listingIds).order("createdAt", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
    db().from("ContactLead").select("*").eq("interestedUserId", ownerId).order("createdAt", { ascending: false }).limit(30),
    listingIds.length ? db().from("ContactLead").select("createdAt,decidedAt,status,listingId").in("listingId", listingIds).order("createdAt", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null })
  ]);
  throwDbError(receivedResult.error);
  throwDbError(sentResult.error);
  throwDbError(metricsResult.error);
  const sentListingIds = [...new Set(((sentResult.data ?? []) as Array<any>).map((lead) => lead.listingId).filter(Boolean))];
  const { data: sentListings, error: sentListingsError } = sentListingIds.length
    ? await db().from("Listing").select("id,title,slug,category,type").in("id", sentListingIds)
    : { data: [], error: null };
  throwDbError(sentListingsError);
  const sentListingById = new Map([...(sentListings ?? []), ...listingRows].map((listing: any) => [listing.id, listing]));
  const received = ((receivedResult.data ?? []) as Array<any>).map((lead) => ({ ...lead, listing: listingById.get(lead.listingId) })).filter((lead) => lead.listing);
  const sent = ((sentResult.data ?? []) as Array<any>).map((lead) => ({ ...lead, listing: sentListingById.get(lead.listingId) })).filter((lead) => lead.listing);
  const metrics = ((metricsResult.data ?? []) as Array<any>).map((lead) => ({ createdAt: lead.createdAt, decidedAt: lead.decidedAt, status: lead.status }));
  return [received, sent, metrics] as const;
}

function countByListing(rows: Array<{ listingId?: string | null }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.listingId) continue;
    counts.set(row.listingId, (counts.get(row.listingId) ?? 0) + 1);
  }
  return counts;
}

function paymentTitle(payment: DashboardPayment) {
  if (payment.kind === "renew") return "Renovação de anúncio";
  if (payment.kind === "publish") return "Publicação de anúncio";
  return "Pagamento";
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    FAILED: "Falhou",
    REFUNDED: "Reembolsado"
  };
  return labels[status] ?? status;
}

function paymentStatusClass(status: string) {
  if (status === "PAID") return "bg-emerald-400/15 text-emerald-200";
  if (status === "PENDING") return "bg-yellow-300/15 text-yellow-100";
  if (status === "FAILED") return "bg-red-400/15 text-red-200";
  return "bg-white/10 text-neutral-200";
}

function serviceCategoryName(slug: string) {
  return defaultServiceCategories.find((item) => item.slug === slug)?.name ?? slug;
}









