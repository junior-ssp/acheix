import Link from "next/link";
import { Eye, Image, Megaphone, Search, SquareStack } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withTimeout } from "@/lib/async";
import { db, throwDbError } from "@/lib/supabase-db";
import { CommunicationPreferences } from "@/components/communication-preferences";
import { DashboardLeads } from "@/components/dashboard-leads";
import { ProfileForm } from "@/components/profile-form";
import { ServiceProfileActivityPanel } from "@/components/service-profile-activity-panel";
import { ServiceProfileActions } from "@/components/service-profile-actions";
import { ServiceCategoryIcon } from "@/components/service-category-icon";
import { PublicShareButton } from "@/components/public-share-button";
import { LogoutButton } from "@/components/logout-button";
import { calculateResponseMetrics, formatAverageResponse, responseTierLabel } from "@/lib/response-metrics";
import { defaultServiceCategories } from "@/lib/service-catalog";
import { serviceBillingSummary } from "@/lib/service-billing-policy";
import { parseServiceComplement } from "@/lib/service-contact-disclosure";
import { isPaidServicePlanCode } from "@/lib/service-plans";
import { findUserBannerCampaigns } from "@/lib/banner-campaigns";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatCurrencyBRL } from "@/lib/formatters";
import { parsePublishProviderRef, parseRenewProviderRef, parseServiceProviderRef } from "@/lib/payments";
import { findUserWantedRequests } from "@/lib/wanted-requests";
import { canManageManualListings, findManagerManualListings } from "@/lib/manual-listings";
import { findDashboardListings } from "@/lib/dashboard-listings-data";

export const dynamic = "force-dynamic";
const showDashboardChatInAccount = false;

export default async function DashboardPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");
  const supabase = getSupabaseAdmin();
  const manualListingManager = canManageManualListings(user);
  const [listings, payments, serviceProfileResult, leadsResult, bannerCampaigns, wantedRequests, manualListings] = await Promise.all([
    findDashboardListings(user.id),
    findDashboardPayments(user.id),
    supabase
      .from("service_profiles")
      .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,status,active,cidade,bairro,estado,last_active_at,activity_confirmation_due_at,complemento,logo_empresa")
      .eq("user_id", user.id)
      .maybeSingle(),
    withTimeout(findDashboardLeads(user.id), [[], [], []] as const, 1800),
    findUserBannerCampaigns(user.id),
    findUserWantedRequests(user.id),
    manualListingManager ? findManagerManualListings(user) : Promise.resolve([])
  ]);
  const serviceProfile = serviceProfileResult.data;
  const serviceBilling = serviceProfile?.status !== "CLOSED" ? serviceBillingSummary(serviceProfile?.complemento) : null;
  const serviceCardViews = serviceProfile ? serviceSearchImpressions(serviceProfile.complemento) : 0;
  const [receivedLeads, sentLeads, ownerLeadsForMetrics] = leadsResult;
  const responseMetrics = calculateResponseMetrics(ownerLeadsForMetrics);
  const responseScore = responseMetrics.score === null ? null : Math.round(responseMetrics.score / 10);
  const metrics = [
    { label: "Ativos", value: listings.filter((item) => item.status === "ACTIVE").length, href: "/dashboard/meus-anuncios?meus=ACTIVE#meus-anuncios" },
    { label: "Pagamentos Pendentes", value: listings.filter((item) => item.status === "DRAFT").length, href: "/dashboard/meus-anuncios?meus=DRAFT#meus-anuncios" },
    { label: "Em Análise", value: listings.filter((item) => item.status === "PENDING_REVIEW").length, href: "/dashboard/meus-anuncios?meus=PENDING_REVIEW#meus-anuncios" },
    { label: "Expirando", value: listings.filter((item) => item.expiresAt <= new Date(Date.now() + 3 * 86400000)).length, href: "/dashboard/meus-anuncios?meus=EXPIRING#meus-anuncios" },
    { label: "Expirados", value: listings.filter((item) => item.status === "EXPIRED").length, href: "/dashboard/meus-anuncios?meus=EXPIRED#meus-anuncios" },
    { label: "Vendidos/Alugados", value: listings.filter((item) => item.status === "SOLD" || item.status === "RENTED").length, href: "/dashboard/meus-anuncios?meus=SOLD_RENTED#meus-anuncios" },
    { label: "Serviços Publicados", value: serviceProfile && serviceProfile.status !== "CLOSED" ? 1 : 0, href: "/dashboard#meus-servicos" },
    { label: "Procura-se", value: wantedRequests.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).length, href: "/dashboard/procura-se" },
    ...(manualListingManager ? [{ label: "Avulsos", value: manualListings.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).length, href: "/dashboard/anuncios-avulsos" }] : []),
    { label: "Banners", value: bannerCampaigns.length, href: "/dashboard/banners" },
    { label: "Visualizações", value: listings.reduce((sum, item) => sum + item.viewCount, 0), href: "/dashboard/meus-anuncios#meus-anuncios" },
    { label: "Cliques", value: listings.reduce((sum, item) => sum + item.contactClickCount, 0), href: "/dashboard/meus-anuncios#meus-anuncios" },
    { label: "Compartilhamentos", value: listings.reduce((sum, item) => sum + item.shareCount, 0), href: "/dashboard/meus-anuncios#meus-anuncios" },
    { label: "Mensagens", value: receivedLeads.length, href: "/mensagens" },
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
        <Link href={"/dashboard/meus-anuncios#meus-anuncios" as any} className="inline-flex h-11 items-center justify-center rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]">Meus Anúncios</Link>
        <Link href="/dashboard#meus-servicos" className="inline-flex h-11 items-center justify-center rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]">Meu CARD</Link>
        <Link href="/servicos/anunciar" className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">Sou Prestador</Link>
      </div>
      <div id="perfil" className="scroll-mt-24">
      <ProfileForm profileCompletion={profileCompletion} user={{
        name: user.name,
        username: user.username,
        cpf: user.cpf,
        phone: user.phone,
        whatsapp: user.whatsapp,
        phoneVerifiedAt: user.phoneVerifiedAt,
        whatsappVerifiedAt: user.whatsappVerifiedAt,
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
      <section id="central-anuncios" className="mt-6 scroll-mt-24 rounded-lg border border-yellow-300/60 bg-[linear-gradient(145deg,#111111_0%,#151515_55%,#0b0b0b_100%)] p-4 shadow-[0_0_28px_rgba(250,204,21,0.16)]">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Central de Anúncios</p>
          <p className="mt-1 text-sm text-neutral-400">Cada opção abre uma página própria, sem misturar todos os blocos na mesma tela.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DashboardAreaLink
            href="/dashboard/meus-anuncios#meus-anuncios"
            label="Meus Anúncios"
            count={`${listings.length} anúncio${listings.length === 1 ? "" : "s"}`}
            icon="listings"
            color="green"
          />
          <DashboardAreaLink
            href="/dashboard/procura-se"
            label="Procura-se"
            count={`${wantedRequests.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).length} ativo(s)`}
            icon="wanted"
            color="yellow"
          />
          {manualListingManager ? (
            <DashboardAreaLink
              href="/dashboard/anuncios-avulsos"
              label="Anúncio Avulso"
              count={`${manualListings.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).length} ativo(s)`}
              icon="manual"
              color="blue"
            />
          ) : null}
          <DashboardAreaLink
            href="/dashboard/banners"
            label="Meus Banners"
            count={`${bannerCampaigns.length} banner${bannerCampaigns.length === 1 ? "" : "s"}`}
            icon="banners"
            color="pink"
          />
        </div>
      </section>
      <CommunicationPreferences
        initialChannels={user.notificationChannels?.length ? user.notificationChannels : [user.notificationChannel ?? "IN_APP"]}
        initialPublicPermissions={{
          whatsapp: user.allowPublicWhatsapp,
          phone: user.allowPublicPhone,
          email: user.allowPublicEmail
        }}
      />
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
      <section id="meus-servicos" className="mt-8 scroll-mt-24 rounded-lg border border-emerald-400/55 bg-[linear-gradient(145deg,#101010_0%,#101713_60%,#071f12_100%)] p-4 shadow-[0_0_26px_rgba(34,197,94,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-yellow-300">Serviços</p>
            <h2 className="mt-1 text-xl font-black">Meu Cartão de Visitas</h2>
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
            <article className="overflow-visible rounded-xl border border-emerald-300/20 bg-[linear-gradient(145deg,#090909_0%,#101713_58%,#071f12_100%)] p-4 shadow-2xl shadow-emerald-950/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {isPaidServicePlanCode(serviceBilling?.billing.planCode) && serviceProfile.logo_empresa ? (
                    <img src={serviceProfile.logo_empresa} alt="Logotipo do CARD" className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl border border-emerald-300/25 bg-black/35 object-contain p-2" />
                  ) : null}
                  <div className="min-w-0">
                    <h3 className="break-words text-2xl font-black">{serviceProfile.nome_fantasia ?? serviceProfile.name ?? serviceCategoryName(serviceProfile.categoria_servico)}</h3>
                    <p className="mt-1 text-xs font-black uppercase text-yellow-300">{serviceProfile.tipo_cadastro === "COMPANY" ? "Empresa Prestadora" : "Profissional Autônomo"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PublicShareButton title={`Achei este profissional: ${serviceProfile.nome_fantasia ?? serviceProfile.name ?? serviceCategoryName(serviceProfile.categoria_servico)}`} path={`/servicos/${serviceProfile.id}`} compact />
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${serviceProfile.active ? "bg-emerald-400/20 text-emerald-100" : "bg-red-400/15 text-red-200"}`}>
                    {serviceProfile.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-neutral-300">{serviceProfile.cidade}/{serviceProfile.estado}{serviceProfile.bairro ? ` - ${serviceProfile.bairro}` : ""}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-100">
                <Eye size={18} className="text-emerald-300" />
                {serviceCardViews} visualização{serviceCardViews === 1 ? "" : "ões"} do CARD
              </div>
              {serviceBilling ? (
                <p className="mt-2 text-sm text-neutral-300">
                  {serviceBilling.billing.status === "TRIALING" ? "Grátis até" : "Plano pago até"} {new Date(serviceBilling.billing.currentPeriodEndsAt).toLocaleDateString("pt-BR")} - R$ {(serviceBilling.billing.renewalPriceCents / 100).toFixed(2).replace(".", ",")} - tolerância até {new Date(serviceBilling.billing.graceEndsAt).toLocaleDateString("pt-BR")}.
                </p>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(serviceProfile.categorias_servico?.length ? serviceProfile.categorias_servico : [serviceProfile.categoria_servico]).map((item: string) => (
                  <span key={item} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/15 px-2 py-3 text-center text-[11px] font-black uppercase leading-tight text-emerald-50 shadow-[0_0_20px_rgba(34,197,94,0.12)]">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#22C55E] text-black shadow-[0_0_18px_rgba(34,197,94,0.35)]">
                      <ServiceCategoryIcon value={item} size={28} strokeWidth={2.8} />
                    </span>
                    <span>{serviceCategoryName(item)}</span>
                  </span>
                ))}
              </div>
              <ServiceProfileActions billing={serviceBilling ? {
                planCode: serviceBilling.billing.planCode,
                status: serviceBilling.billing.status,
                daysUntilDue: serviceBilling.daysUntilDue
              } : null} />
            </article>
          ) : null}
          {!serviceProfile || serviceProfile.status === "CLOSED" ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-black/25 p-4 text-sm text-neutral-300 md:col-span-2">
              Você ainda não publicou serviços. Ative a opção <strong className="text-yellow-300">Sou Prestador de Serviços</strong> para cadastrar suas especialidades.
            </div>
          ) : null}
        </div>
      </section>
      {showDashboardChatInAccount ? <DashboardLeads
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
          listing: { title: lead.listing.title, slug: lead.listing.slug, category: lead.listing.category, type: lead.listing.type, photoUrl: lead.listing.photoUrl ?? null }
        }))}
        sent={sentLeads.map((lead) => ({
          id: lead.id,
          status: lead.status,
          readAt: lead.readAt ? new Date(lead.readAt).toISOString() : null,
          createdAt: new Date(lead.createdAt).toISOString(),
          listing: { title: lead.listing.title, slug: lead.listing.slug, category: lead.listing.category, type: lead.listing.type, photoUrl: lead.listing.photoUrl ?? null }
        }))}
      /> : null}
      <DashboardPayments payments={payments} />
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
    </main>
  );
}

function DashboardAreaLink({
  href,
  label,
  count,
  icon,
  color
}: {
  href: string;
  label: string;
  count: string;
  icon: "listings" | "wanted" | "manual" | "banners";
  color: "green" | "yellow" | "blue" | "pink";
}) {
  const Icon = icon === "listings" ? SquareStack : icon === "wanted" ? Search : icon === "manual" ? Megaphone : Image;
  const styles = {
    green: "border-emerald-400/70 bg-emerald-400/10 text-emerald-100 shadow-[0_0_24px_rgba(34,197,94,0.14)] hover:border-emerald-300",
    yellow: "border-yellow-300/75 bg-yellow-300/10 text-yellow-50 shadow-[0_0_24px_rgba(250,204,21,0.16)] hover:border-yellow-200",
    blue: "border-sky-400/75 bg-sky-400/10 text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.14)] hover:border-sky-300",
    pink: "border-fuchsia-400/70 bg-fuchsia-400/10 text-fuchsia-50 shadow-[0_0_24px_rgba(217,70,239,0.13)] hover:border-fuchsia-300"
  }[color];
  return (
    <Link href={href as any} className={`flex aspect-square min-h-32 flex-col justify-between rounded-lg border-2 p-4 text-left transition hover:-translate-y-0.5 ${styles}`}>
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-black/45">
        <Icon size={28} strokeWidth={2.6} />
      </span>
      <span>
        <span className="block text-base font-black leading-tight text-white">{label}</span>
        <span className="mt-1 block text-xs font-bold text-neutral-300">{count}</span>
      </span>
    </Link>
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
  kind: "publish" | "renew" | "service" | "payment";
  planCode: string | null;
};

function DashboardPayments({ payments }: { payments: DashboardPayment[] }) {
  return (
    <section id="meus-pagamentos" className="mt-8 scroll-mt-24 rounded-lg border border-indigo-400/50 bg-[linear-gradient(145deg,#101010_0%,#111326_60%,#0d1026_100%)] p-4 shadow-[0_0_26px_rgba(129,140,248,0.10)]">
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
                  {payment.kind === "renew" ? "Renovação" : payment.kind === "publish" ? "Publicação" : payment.kind === "service" ? "Serviços" : "Pagamento"} · {payment.planCode ?? "Plano"}
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
    const service = parseServiceProviderRef(payment.providerRef);
    const reference = publish ?? renew;
    return {
      payment,
      listingId: reference?.listingId ?? null,
      planCode: service?.planCode ?? reference?.planCode ?? null,
      kind: publish ? "publish" as const : renew ? "renew" as const : service ? "service" as const : "payment" as const
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
  const listingIds = listingRows.map((listing) => listing.id);
  const ownerPhotosResult = listingIds.length ? await firstPhotosByListing(listingIds) : new Map<string, string | null>();
  const ownerListingRows = listingRows.map((listing) => ({ ...listing, photoUrl: ownerPhotosResult.get(listing.id) ?? null }));
  const listingById = new Map(ownerListingRows.map((listing) => [listing.id, listing]));
  const [receivedResult, sentResult, metricsResult] = await Promise.all([
    listingIds.length ? db().from("ContactLead").select("id,listingId,interestedUserId,name,email,phone,question1,question2,question3,status,createdAt").in("listingId", listingIds).order("createdAt", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
    db().from("ContactLead").select("id,listingId,status,readAt,createdAt").eq("interestedUserId", ownerId).order("createdAt", { ascending: false }).limit(30),
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
  const sentPhotosResult = sentListingIds.length ? await firstPhotosByListing(sentListingIds) : new Map<string, string | null>();
  const sentListingRows = (sentListings ?? []).map((listing: any) => ({ ...listing, photoUrl: sentPhotosResult.get(listing.id) ?? null }));
  const sentListingById = new Map([...sentListingRows, ...ownerListingRows].map((listing: any) => [listing.id, listing]));
  const received = ((receivedResult.data ?? []) as Array<any>).map((lead) => ({ ...lead, listing: listingById.get(lead.listingId) })).filter((lead) => lead.listing);
  const sent = ((sentResult.data ?? []) as Array<any>).map((lead) => ({ ...lead, listing: sentListingById.get(lead.listingId) })).filter((lead) => lead.listing);
  const metrics = ((metricsResult.data ?? []) as Array<any>).map((lead) => ({ createdAt: lead.createdAt, decidedAt: lead.decidedAt, status: lead.status }));
  return [received, sent, metrics] as const;
}

async function firstPhotosByListing(listingIds: string[]) {
  const { data, error } = await db().from("Photo").select("listingId,url,order").in("listingId", listingIds).order("order", { ascending: true });
  throwDbError(error);
  const photos = new Map<string, string | null>();
  for (const photo of (data ?? []) as Array<{ listingId: string; url: string | null }>) {
    if (!photos.has(photo.listingId)) photos.set(photo.listingId, photo.url ?? null);
  }
  return photos;
}

function paymentTitle(payment: DashboardPayment) {
  if (payment.kind === "renew") return "Renovação de anúncio";
  if (payment.kind === "publish") return "Publicação de anúncio";
  if (payment.kind === "service") return "Plano de Serviços";
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

function serviceSearchImpressions(complement: string | null | undefined) {
  const parsed = parseServiceComplement(complement);
  const exposure = parsed.serviceSearchExposure && typeof parsed.serviceSearchExposure === "object"
    ? parsed.serviceSearchExposure as Record<string, unknown>
    : {};
  const views = Number(exposure.searchImpressions ?? 0);
  return Number.isFinite(views) && views > 0 ? Math.floor(views) : 0;
}








