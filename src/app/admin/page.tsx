import Link from "next/link";
import { requireBackofficePageUser } from "@/lib/admin-auth";
import { AdminSystemMonitor } from "@/components/admin-system-monitor";
import { AdminBannerOrderManager } from "@/components/admin-banner-order-manager";
import { AdminFinancePanel } from "@/components/admin-finance-panel";
import { AdminSiteAccessPanel } from "@/components/admin-site-access-panel";
import { LogoutButton } from "@/components/logout-button";
import { db, throwDbError } from "@/lib/supabase-db";
import { formatPhone } from "@/lib/formatters";
import { getFinanceData, parseFinanceRange } from "@/lib/admin-finance";
import { findActiveBannerCampaignsForAdmin } from "@/lib/banner-campaigns";
import { getMessageSafetyAdminConfig } from "@/lib/message-safety";
import { serviceBillingSummary } from "@/lib/service-billing-policy";
import { getSiteAccessStats, type SiteAccessStats } from "@/lib/site-access-analytics";
import { normalizeRealEstatePurpose, realEstatePurposeLabels, realEstatePurposes, type RealEstatePurpose } from "@/lib/real-estate-taxonomy";

export const dynamic = "force-dynamic";

const reportReasonLabels: Record<string, string> = {
  SCAM_ATTEMPT: "Golpe/Fraude",
  FAKE_LISTING: "Informação Falsa",
  NON_EXISTENT_PRODUCT: "Anunciante Inexistente",
  NON_EXISTENT_PROPERTY: "Anunciante Inexistente",
  INAPPROPRIATE_CONTENT: "Conteúdo Proibido",
  HARASSMENT_OR_THREAT: "Comportamento Inadequado",
  FAKE_DOCUMENT: "Documento Falso",
  SUSPICIOUS_PAYMENT: "Pagamento Suspeito",
  SERVICE_NOT_DELIVERED: "Serviço Não Feito",
  SPAM: "Spam",
  OTHER: "Outro"
};

const caseStatusOptions = [
  { value: "TODOS", label: "Todos" },
  { value: "OPEN", label: "Aberto" },
  { value: "MONITORING", label: "Em Observação" },
  { value: "NEEDS_REVIEW", label: "Precisa de Revisão" },
  { value: "PREVENTIVE_ACTION", label: "Ação Preventiva" },
  { value: "RESOLVED", label: "Resolvido" },
  { value: "APPEALED", label: "Em Recurso" }
];

const targetTypeOptions = [
  { value: "TODOS", label: "Todos" },
  { value: "LISTING", label: "Anúncio" },
  { value: "USER", label: "Usuário" },
  { value: "SERVICE", label: "Serviço" }
];

const caseStatusLabels = Object.fromEntries(caseStatusOptions.map((item) => [item.value, item.label]));
const targetTypeLabels = Object.fromEntries(targetTypeOptions.map((item) => [item.value, item.label]));

export default async function AdminPage({
  searchParams
}: {
  searchParams?: {
    status?: string;
    category?: string;
    userSearchBy?: string;
    userSearch?: string;
    listingSearchBy?: string;
    listingSearch?: string;
    realEstatePurpose?: string;
    userPeriod?: string;
    reportPeriod?: string;
    financeStart?: string;
    financeEnd?: string;
    supportStatus?: string;
    serviceSearch?: string;
    serviceStatus?: string;
  };
}) {
  const admin = await requireBackofficePageUser();
  const statusFilter = searchParams?.status;
  const categoryFilter = searchParams?.category;
  const userSearchBy = searchParams?.userSearchBy ?? "name";
  const userSearch = searchParams?.userSearch?.trim() ?? "";
  const hasUserSearch = userSearch.length > 0;
  const userPeriod = normalizePeriod(searchParams?.userPeriod, "all");
  const reportPeriod = normalizePeriod(searchParams?.reportPeriod, "all");
  const listingSearchBy = searchParams?.listingSearchBy ?? "listing";
  const listingSearch = searchParams?.listingSearch?.trim() ?? "";
  const realEstatePurpose = normalizeRealEstatePurpose(searchParams?.realEstatePurpose) ?? "";
  const hasListingSearch = listingSearch.length > 0 || Boolean(realEstatePurpose);
  const financeRange = parseFinanceRange(searchParams?.financeStart, searchParams?.financeEnd);
  const supportStatus = searchParams?.supportStatus ?? "OPEN";
  const serviceSearch = searchParams?.serviceSearch?.trim() ?? "";
  const serviceStatus = searchParams?.serviceStatus ?? "ALL";
  const trustWhere = {
    ...(statusFilter && statusFilter !== "TODOS" ? { status: statusFilter as any } : {}),
    ...(categoryFilter && categoryFilter !== "TODOS" ? { targetType: categoryFilter as any } : {}),
    period: reportPeriod
  };

  const [
    totalUsers,
    totalListings,
    totalServices,
    totalReports,
    blockedActions,
    activeListings,
    pendingListings,
    totalPayments,
    trustCases,
    users,
    allPlans,
    listings,
    services,
    supportRequests,
    totalSupportRequests,
    financeData,
    messageSafetyConfig,
    activeBannerCampaigns,
    siteAccessStats,
    cpfChangeRequests
  ] = await Promise.all([
    safeAdminValue("totalUsers", 0, () => countRows("User")),
    safeAdminValue("totalListings", 0, () => countRows("Listing")),
    safeAdminValue("totalServices", 0, () => countRows("service_profiles")),
    safeAdminValue("totalReports", 0, () => countRows("TrustReport")),
    safeAdminValue("blockedActions", 0, () => countRows("AuditLog", (query) => query.ilike("action", "%user_block%"))),
    safeAdminValue("activeListings", 0, () => countRows("Listing", (query) => query.eq("status", "ACTIVE"))),
    safeAdminValue("pendingListings", 0, () => countRows("Listing", (query) => query.eq("status", "PENDING_REVIEW"))),
    safeAdminValue("totalPayments", emptyPaymentAggregate(), getPaymentAggregate),
    safeAdminValue("trustCases", [], () => findTrustCases(trustWhere)),
    safeAdminValue("users", [], () => hasUserSearch ? findAdminUsers(userSearchBy, userSearch) : findRecentAdminUsers(userPeriod)),
    safeAdminValue("allPlans", [], findAdminPlans),
    safeAdminValue("listings", [], () => hasListingSearch ? findAdminListings(listingSearchBy, listingSearch, realEstatePurpose) : Promise.resolve([])),
    safeAdminValue("services", [], () => findAdminServices(serviceSearch, serviceStatus)),
    safeAdminValue("supportRequests", [], () => findSupportRequests(supportStatus)),
    safeAdminValue("totalSupportRequests", 0, () => countSupportRequests("OPEN")),
    safeAdminValue("financeData", emptyFinanceData(financeRange), () => getFinanceData(financeRange)),
    safeAdminValue("messageSafetyConfig", emptyMessageSafetyConfig(), getMessageSafetyAdminConfig),
    safeAdminValue("activeBannerCampaigns", [], () => findActiveBannerCampaignsForAdmin(50)),
    safeAdminValue("siteAccessStats", emptySiteAccessStats(), getSiteAccessStats),
    safeAdminValue("cpfChangeRequests", [], findCpfChangeRequests)
  ]);

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-lg border border-white/10 bg-neutral-950 p-5">
          <p className="text-xs font-black uppercase text-yellow-300">Backoffice Achei X</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">Painel Administrativo</h1>
              <p className="mt-1 text-sm text-neutral-400">Área separada para gestão e moderação.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-yellow-300/30 px-4 py-2 text-sm font-black text-yellow-200">
                {admin.adminAccessLevel === "SUPER_ADMIN" ? "Super Admin" : "Moderador"} · {admin.name}
              </div>
              <LogoutButton className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-2 text-sm font-black text-black transition hover:bg-yellow-300 active:scale-[0.98]" label="Sair" />
            </div>
          </div>
        </header>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm font-black">
          {["Dashboard", "Acessos", "Denúncias", "Usuários", "CPF", "Moderação", "Anúncios", "Banners", "Serviços", "Suporte", "Financeiro", ...(admin.adminAccessLevel === "SUPER_ADMIN" ? ["Segurança", "Sistema"] : [])].map((item) => (
            <a key={item} href={`#${slugify(item)}`} className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-yellow-300 hover:text-black">
              {item}
            </a>
          ))}
        </nav>

        <AdminSiteAccessPanel stats={siteAccessStats} />

        <section id="dashboard" className="mt-5 grid scroll-mt-24 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Usuários" value={totalUsers} href="#usuarios" />
          <Metric label="Anúncios" value={totalListings} href="#anuncios" />
          <Metric label="Prestadores" value={totalServices} href="#servicos" />
          <Metric label="Reportes" value={totalReports} href="#denuncias" />
          <Metric label="Bloqueios Registrados" value={blockedActions} href="#usuarios" />
          <Metric label="Anúncios Ativos" value={activeListings} href="#anuncios" />
          <Metric label="Em Análise" value={pendingListings} href="#anuncios" />
          <Metric label="Pagamentos" value={totalPayments._count} href="#financeiro" />
          <Metric label="Receita Registrada" value={formatCurrency(totalPayments._sum.amountCents ?? 0)} href="#financeiro" />
          <Metric label="Casos Abertos" value={trustCases.length} href="#denuncias" />
          <Metric label="Suporte Aberto" value={totalSupportRequests} href="#suporte" />
        </section>

        <section id="denuncias" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Central de Denúncias" text="Fila de análise com histórico, evidências e decisões." />
          <form className="mt-4 flex flex-wrap gap-2">
            <select name="reportPeriod" defaultValue={reportPeriod} className="input max-w-56">
              <option value="day">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Últimos 30 dias</option>
              <option value="all">Tudo</option>
            </select>
            <select name="status" defaultValue={statusFilter ?? "TODOS"} className="input max-w-56">
              {caseStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <select name="category" defaultValue={categoryFilter ?? "TODOS"} className="input max-w-56">
              {targetTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button className="rounded-full px-4 btn-gold">Filtrar</button>
          </form>
          <div className="mt-4 grid gap-4">
            {trustCases.map((item: any) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-yellow-300">{targetTypeLabels[item.targetType] ?? item.targetType} · {caseStatusLabels[item.status] ?? item.status}</p>
                    <h3 className="mt-1 text-lg font-black">{riskLabel(item.riskScore)} · {item.riskScore} pontos</h3>
                    <p className="mt-1 text-sm text-neutral-300">Alvo: {item.targetUser?.name ?? item.targetUserId ?? item.listingId ?? item.serviceId ?? "Não Identificado"}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{item.riskLevel}</span>
                </div>
                <div className="mt-3 grid gap-3">
                  {item.reports.map((report: any) => (
                    <div key={report.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                      <p className="font-black">{reportReasonLabels[report.reason] ?? report.reason}</p>
                      <p className="mt-1 text-neutral-300">{report.description}</p>
                      <p className="mt-1 text-xs text-neutral-500">Por: {report.reporter.name} · {formatDate(report.createdAt)}</p>
                      {report.evidenceUrls.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {report.evidenceUrls.map((url: string) => (
                            <a key={url} href={url} target="_blank" className="rounded-full border border-yellow-300/30 px-3 py-1 text-xs font-black text-yellow-200">Ver Evidência</a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <AdminActions caseId={item.id} />
              </article>
            ))}
            {!trustCases.length ? <p className="text-sm text-neutral-400">Nenhuma denúncia encontrada.</p> : null}
          </div>
        </section>

        <section id="usuarios" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Usuários, Planos e Acessos" text="Primeiro veja a lista resumida. Abra a gestão apenas do usuário que deseja alterar." />
          <form className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            {categoryFilter ? <input type="hidden" name="category" value={categoryFilter} /> : null}
            <div className="grid gap-2 lg:grid-cols-[180px_200px_1fr_auto]">
              <label className="grid gap-1 text-xs font-black uppercase text-yellow-300">
                Período
                <select name="userPeriod" defaultValue={userPeriod} className="input">
                  <option value="day">Hoje</option>
                  <option value="week">Últimos 7 dias</option>
                  <option value="month">Últimos 30 dias</option>
                  <option value="all">Últimos usuários</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-yellow-300">
                Buscar por
                <select name="userSearchBy" defaultValue={userSearchBy} className="input">
                  <option value="name">Nome</option>
                  <option value="fullName">Nome Completo</option>
                  <option value="username">Username</option>
                  <option value="email">Email</option>
                  <option value="phone">Telefone</option>
                  <option value="listing">Link do Anúncio</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-yellow-300">
                Pesquisa
                <input name="userSearch" defaultValue={userSearch} placeholder="Nome, telefone, username, e-mail ou link" className="input" />
              </label>
              <button className="h-12 self-end rounded-full px-6 btn-gold">Buscar</button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">Deixe a pesquisa vazia para ver os usuários mais recentes.</p>
          </form>
          <div className="mt-4 grid gap-4">
            {users.map((user: any) => (
              <UserAdminCard key={user.id} user={user} allPlans={allPlans} canManage={admin.adminAccessLevel === "SUPER_ADMIN"} />
            ))}
            {!users.length ? <p className="text-sm text-neutral-400">{hasUserSearch ? "Nenhum usuário encontrado." : "Nenhum usuário recente nesse período."}</p> : null}
          </div>
          {users.length ? <p className="mt-3 text-xs text-neutral-500">Exibindo no máximo 5 usuários. Use a busca para localizar outro cadastro sem carregar uma lista extensa.</p> : null}
        </section>

        <section id="cpf" className="mt-8 scroll-mt-24 rounded-lg border border-yellow-300/30 bg-neutral-950 p-5">
          <SectionTitle title="Análise de CPF" text="Confira documento e selfie antes de aprovar. Se o OCR não ler o CPF, faça a análise manual pela imagem enviada." />
          <div className="mt-4 grid gap-4">
            {cpfChangeRequests.map((item: any) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-yellow-300">{item.status} · {formatDate(item.createdAt)}</p>
                    <h3 className="mt-1 text-lg font-black">{item.user?.name ?? "Usuário"}</h3>
                    <p className="mt-1 text-neutral-300">{item.user?.email ?? ""} · {formatPhone(item.user?.phone ?? item.user?.whatsapp) || "Sem telefone"}</p>
                    <p className="mt-1 text-xs text-neutral-400">CPF atual: {maskCpf(item.currentCpf)} · Novo CPF: {maskCpf(item.requestedCpf)}</p>
                    <p className={`mt-2 text-xs font-black ${item.ocrCpfMatched === true ? "text-emerald-300" : item.ocrCpfMatched === false ? "text-red-300" : "text-yellow-300"}`}>
                      {item.ocrCpfMatched === true ? "Leitura automática encontrou o CPF informado." : item.ocrCpfMatched === false ? "Atenção: a leitura automática encontrou um CPF diferente." : "A leitura automática não conseguiu confirmar o CPF. Analise o documento manualmente."}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{item.documentOcrProvider ?? "OCR"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.documentSignedUrl ? <a href={item.documentSignedUrl} target="_blank" className="rounded-full border border-yellow-300/30 px-3 py-1 text-xs font-black text-yellow-200">Ver documento</a> : null}
                  {item.selfieSignedUrl ? <a href={item.selfieSignedUrl} target="_blank" className="rounded-full border border-yellow-300/30 px-3 py-1 text-xs font-black text-yellow-200">Ver selfie</a> : null}
                </div>
                {item.documentOcrText ? (
                  <details className="mt-3 rounded-md border border-white/10 bg-white/5 p-3">
                    <summary className="cursor-pointer text-xs font-black text-yellow-300">Texto extraído pelo OCR</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-neutral-300">{item.documentOcrText}</pre>
                  </details>
                ) : null}
                {item.status === "PENDING_REVIEW" ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <form action="/api/admin/actions" method="POST" className="grid gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                      <input type="hidden" name="action" value="approve_cpf_change" />
                      <input type="hidden" name="requestId" value={item.id} />
                      <textarea name="note" placeholder="Observação opcional" className="input min-h-20" />
                      <button className="rounded-full bg-[#22C55E] px-4 py-2 text-sm font-black text-black">Aprovar CPF</button>
                    </form>
                    <form action="/api/admin/actions" method="POST" className="grid gap-2 rounded-lg border border-red-400/20 bg-red-400/5 p-3">
                      <input type="hidden" name="action" value="reject_cpf_change" />
                      <input type="hidden" name="requestId" value={item.id} />
                      <textarea name="note" required placeholder="Motivo da reprovação" className="input min-h-20" />
                      <button className="rounded-full border border-red-400/40 px-4 py-2 text-sm font-black text-red-200">Reprovar</button>
                    </form>
                  </div>
                ) : null}
                {admin.adminAccessLevel === "SUPER_ADMIN" && item.user?.id ? (
                  <div className="mt-4 rounded-lg border border-red-400/25 bg-red-950/10 p-3">
                    <p className="text-xs font-black uppercase text-red-200">Ações rápidas contra risco</p>
                    <UserRiskActions targetUserId={item.user.id} />
                  </div>
                ) : null}
              </article>
            ))}
            {!cpfChangeRequests.length ? (
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                <strong className="block text-base text-white">Tudo certo por enquanto.</strong>
                <p className="mt-1">Não existe nenhuma troca de CPF aguardando sua análise agora. Quando alguém enviar documento e selfie, o pedido aparecerá aqui.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section id="moderacao" className="mt-8 scroll-mt-24 rounded-lg border border-yellow-300/30 bg-neutral-950 p-5">
          <SectionTitle title="Moderação de Usuários" text="Área separada para analisar documentos, perfis suspeitos e agir rápido sem poluir o painel principal." />
          <Link href={"/admin/moderacao" as any} className="mt-4 inline-flex rounded-full px-5 py-3 text-sm font-black btn-gold">
            Abrir Central de Moderação
          </Link>
        </section>

        <section id="anuncios" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Gestão de Anúncios" />
          <form className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 md:grid-cols-[200px_180px_1fr_auto]">
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            {categoryFilter ? <input type="hidden" name="category" value={categoryFilter} /> : null}
            {userSearch ? <input type="hidden" name="userSearch" value={userSearch} /> : null}
            {userSearchBy ? <input type="hidden" name="userSearchBy" value={userSearchBy} /> : null}
            <select name="listingSearchBy" defaultValue={listingSearchBy} className="input">
              <option value="name">Nome</option>
              <option value="fullName">Nome Completo</option>
              <option value="username">Username</option>
              <option value="email">Email</option>
              <option value="phone">Telefone</option>
              <option value="listing">Link do Anúncio</option>
              <option value="userListings">Anúncios do Usuário</option>
            </select>
            <select name="realEstatePurpose" defaultValue={realEstatePurpose} className="input"><option value="">Todas as finalidades</option>{realEstatePurposes.map((purpose) => <option key={purpose} value={purpose}>{realEstatePurposeLabels[purpose]}</option>)}</select>
            <input name="listingSearch" defaultValue={listingSearch} placeholder="Digite aqui para buscar" className="input" />
            <button className="rounded-full px-5 btn-gold">Buscar</button>
          </form>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            {listings.map((listing: any) => (
              <div key={listing.id} className="grid gap-2 border-b border-white/10 bg-black/25 p-3 text-sm md:grid-cols-[1fr_150px_120px_220px]">
                <div>
                  <strong>{listing.title}</strong>
                  <p className="text-neutral-400">{listing.owner.name} · {listing.city}/{listing.state}</p>
                  <p className="text-xs text-neutral-500">{listing.owner.email} · {formatPhone(listing.owner.phone ?? listing.owner.whatsapp) || "Sem Telefone"}</p>
                </div>
                <span>{listing.status}</span>
                <span>{listing.plan.name}</span>
                <ActionRow>
                  <AdminForm action="hide_listing" listingId={listing.id} label="Ocultar" />
                  <AdminForm action="restore_listing" listingId={listing.id} label="Restaurar" />
                  <AdminForm action="remove_listing" listingId={listing.id} label="Remover" />
                </ActionRow>
              </div>
            ))}
            {!hasListingSearch ? <p className="p-3 text-sm text-neutral-400">Digite uma busca para ver anúncios.</p> : null}
            {hasListingSearch && !listings.length ? <p className="p-3 text-sm text-neutral-400">Nenhum anúncio encontrado.</p> : null}
          </div>
        </section>

        <section id="banners" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Ordem dos Banners Patrocinados" text="Controle geral do carrossel. Use subir/descer para definir quais banners aparecem primeiro." />
          {admin.adminAccessLevel === "SUPER_ADMIN" ? (
            <AdminBannerOrderManager banners={activeBannerCampaigns} />
          ) : (
            <p className="mt-4 text-sm text-neutral-400">Somente Super Admin pode alterar a ordem geral dos banners.</p>
          )}
        </section>

        <section id="servicos" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Gestão de Prestadores" text="Localize o profissional e abra somente a gestão que deseja consultar ou alterar." />
          <form className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 md:grid-cols-[180px_1fr_auto]">
            <select name="serviceStatus" defaultValue={serviceStatus} className="input">
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="PAUSED">Pausados</option>
              <option value="ARCHIVED">Arquivados</option>
              <option value="CLOSED">Encerrados</option>
            </select>
            <input name="serviceSearch" defaultValue={serviceSearch} placeholder="Nome, empresa, profissão ou cidade" className="input" />
            <button className="rounded-full px-5 btn-gold">Buscar</button>
          </form>
          <div className="mt-4 grid gap-4">
            {services.map((service: any) => <ServiceAdminCard key={service.id} service={service} canManage={admin.adminAccessLevel === "SUPER_ADMIN"} />)}
            {!services.length ? <p className="text-sm text-neutral-400">Nenhum prestador encontrado.</p> : null}
          </div>
          {services.length ? <p className="mt-3 text-xs text-neutral-500">Exibindo no máximo 5 prestadores. Use a busca e o filtro para localizar outros cadastros.</p> : null}
        </section>

        <section id="suporte" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Fale Conosco" text="Solicitações enviadas pelo formulário do app e do site." />
          <form className="mt-4 flex flex-wrap gap-2">
            <select name="supportStatus" defaultValue={supportStatus} className="input max-w-56">
              <option value="OPEN">Abertas</option>
              <option value="ALL">Todas</option>
            </select>
            <button className="rounded-full px-4 btn-gold">Filtrar</button>
          </form>
          <div className="mt-4 grid gap-3">
            {supportRequests.map((item: any) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-yellow-300">{supportCategoryLabel(item.category)} · {formatDate(item.createdAt)}</p>
                    <h3 className="mt-1 text-lg font-black">{item.subject}</h3>
                    <p className="mt-1 text-neutral-300">{item.name}{item.username ? ` · @${item.username}` : ""}</p>
                    <p className="text-xs text-neutral-500">{item.email} · {formatPhone(item.whatsapp ?? item.phone) || "Sem telefone"} · {item.userId ? `Usuário: ${item.userId}` : "Visitante"}</p>
                  </div>
                  <span className="rounded-full border border-yellow-300/30 px-3 py-1 text-xs font-black text-yellow-200">{item.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-md border border-white/10 bg-white/5 p-3 text-neutral-200">{item.message}</p>
              </article>
            ))}
            {!supportRequests.length ? <p className="text-sm text-neutral-400">Nenhuma solicitação de suporte encontrada.</p> : null}
          </div>
        </section>

        <AdminFinancePanel summaries={financeData.summaries} rows={financeData.rows} range={financeRange} />

        {admin.adminAccessLevel === "SUPER_ADMIN" ? (
          <section id="seguranca" className="mt-8 scroll-mt-24 rounded-lg border border-yellow-300/30 bg-neutral-950 p-5">
            <SectionTitle title="Segurança de Mensagens" text="Palavras, frases e marcas usadas para bloquear captação comercial, assédio e prospecção de anunciantes." />
            <form action="/api/admin/actions" method="POST" className="mt-4 grid gap-3">
              <input type="hidden" name="action" value="update_message_safety_keywords" />
              <label className="grid gap-2">
                <span className="text-sm font-black text-yellow-300">Palavras ou frases bloqueadas</span>
                <textarea
                  name="terms"
                  defaultValue={messageSafetyConfig.text}
                  rows={10}
                  className="input min-h-60 font-mono text-sm"
                  placeholder="Uma palavra ou frase por linha"
                />
              </label>
              <p className="text-xs text-neutral-400">
                Links externos já são bloqueados automaticamente. Links permitidos: acheix.com.br e achei-x.com.br.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-full px-5 py-2 btn-gold">Salvar Filtro de Mensagens</button>
              </div>
            </form>
          </section>
        ) : null}

        {admin.adminAccessLevel === "SUPER_ADMIN" ? <AdminSystemMonitor /> : null}
      </div>
    </main>
  );
}

async function countRows(table: string, apply?: (query: any) => any) {
  let query = db().from(table).select("id", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  throwDbError(error);
  return count ?? 0;
}

async function safeAdminValue<T>(label: string, fallback: T, load: () => Promise<T>) {
  try {
    return await load();
  } catch (error) {
    console.error(`Admin dashboard fallback: ${label}`, error);
    return fallback;
  }
}

function emptyPaymentAggregate() {
  return { _sum: { amountCents: 0 }, _count: 0 };
}

function emptyFinanceData(range: ReturnType<typeof parseFinanceRange>) {
  const labels = ["Hoje", "Semana", "Quinzena", "Mês", "Trimestre", "Semestre", "Ano", "Período"];
  const summaries = labels.map((label) => ({
    label,
    start: label === "Período" ? range.start : new Date(),
    end: label === "Período" ? range.end : new Date(),
    revenueCents: 0,
    paidPayments: 0,
    renewedListings: 0,
    renewalPercent: 0
  }));
  return { summaries, rows: [] };
}

function emptyMessageSafetyConfig() {
  return { terms: [], text: "", defaultText: "" };
}

function emptySiteAccessStats(): SiteAccessStats {
  const states = [
    ["AC", "Acre"],
    ["AL", "Alagoas"],
    ["AP", "Amapá"],
    ["AM", "Amazonas"],
    ["BA", "Bahia"],
    ["CE", "Ceará"],
    ["DF", "Distrito Federal"],
    ["ES", "Espírito Santo"],
    ["GO", "Goiás"],
    ["MA", "Maranhão"],
    ["MT", "Mato Grosso"],
    ["MS", "Mato Grosso do Sul"],
    ["MG", "Minas Gerais"],
    ["PA", "Pará"],
    ["PB", "Paraíba"],
    ["PR", "Paraná"],
    ["PE", "Pernambuco"],
    ["PI", "Piauí"],
    ["RJ", "Rio de Janeiro"],
    ["RN", "Rio Grande do Norte"],
    ["RS", "Rio Grande do Sul"],
    ["RO", "Rondônia"],
    ["RR", "Roraima"],
    ["SC", "Santa Catarina"],
    ["SP", "São Paulo"],
    ["SE", "Sergipe"],
    ["TO", "Tocantins"]
  ];
  return {
    total: 0,
    statesWithAccess: 0,
    topState: null,
    states: states.map(([state_code, state_name]) => ({ state_code, state_name, access_count: 0, percentage: 0 }))
  };
}

async function getPaymentAggregate() {
  const { data, error } = await db().from("Payment").select("amountCents");
  throwDbError(error);
  const rows = (data ?? []) as Array<{ amountCents: number }>;
  return { _sum: { amountCents: rows.reduce((sum, row) => sum + (row.amountCents ?? 0), 0) }, _count: rows.length };
}

async function findTrustCases(filters: { status?: string; targetType?: string; period?: string }) {
  let query = db()
    .from("TrustCase")
    .select("id,targetUserId,targetType,listingId,serviceId,riskScore,riskLevel,status,requiresHumanReview,preventiveAction,updatedAt")
    .order("requiresHumanReview", { ascending: false })
    .order("updatedAt", { ascending: false })
    .limit(30);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.targetType) query = query.eq("targetType", filters.targetType);
  const since = periodStart(filters.period);
  if (since) query = query.gte("updatedAt", since.toISOString());
  const { data, error } = await query;
  throwDbError(error);
  const cases = (data ?? []) as Array<any>;
  const targetUserIds = [...new Set(cases.map((item) => item.targetUserId).filter(Boolean))];
  const caseIds = cases.map((item) => item.id);
  const [targetUsers, reportsByCase, decisionsByCase] = await Promise.all([
    findUsersByIds(targetUserIds),
    findReportsByCaseIds(caseIds),
    findDecisionsByCaseIds(caseIds)
  ]);
  return cases.map((item) => ({
    ...item,
    targetUser: item.targetUserId ? targetUsers.get(item.targetUserId) ?? null : null,
    reports: reportsByCase.get(item.id) ?? [],
    decisions: decisionsByCase.get(item.id) ?? []
  }));
}

async function findReportsByCaseIds(caseIds: string[]) {
  const grouped = new Map<string, Array<any>>();
  if (!caseIds.length) return grouped;
  const { data, error } = await db()
    .from("TrustReport")
    .select("id,caseId,reporterId,reason,description,evidenceUrls,createdAt")
    .in("caseId", caseIds)
    .order("createdAt", { ascending: false });
  throwDbError(error);
  const reports = (data ?? []) as Array<any>;
  const reporters = await findUsersByIds([...new Set(reports.map((report) => report.reporterId).filter(Boolean))]);
  const reportsWithSecureEvidence = await Promise.all(reports.map(async (report) => ({
    ...report,
    evidenceUrls: await resolveEvidenceUrls(report.evidenceUrls)
  })));
  for (const report of reportsWithSecureEvidence) {
    const current = grouped.get(report.caseId) ?? [];
    if (current.length < 5) current.push({ ...report, reporter: reporters.get(report.reporterId) ?? { name: "Usuário", email: "" } });
    grouped.set(report.caseId, current);
  }
  return grouped;
}

async function resolveEvidenceUrls(values: unknown) {
  const urls = Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
  return (await Promise.all(urls.map(async (url) => {
    const prefix = "supabase-private://report-evidence/";
    if (!url.startsWith(prefix)) return url;
    try {
      const path = decodeURIComponent(url.slice(prefix.length));
      const { data, error } = await db().storage.from("report-evidence").createSignedUrl(path, 10 * 60);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }))).filter((url): url is string => Boolean(url));
}

async function findDecisionsByCaseIds(caseIds: string[]) {
  const grouped = new Map<string, Array<any>>();
  if (!caseIds.length) return grouped;
  const { data, error } = await db()
    .from("TrustDecision")
    .select("id,caseId,action,note,createdAt")
    .in("caseId", caseIds)
    .order("createdAt", { ascending: false });
  throwDbError(error);
  for (const decision of (data ?? []) as Array<any>) {
    const current = grouped.get(decision.caseId) ?? [];
    if (current.length < 3) current.push(decision);
    grouped.set(decision.caseId, current);
  }
  return grouped;
}

async function findCpfChangeRequests() {
  const { data, error } = await db()
    .from("CpfChangeRequest")
    .select("id,userId,currentCpf,requestedCpf,status,documentUrl,selfieUrl,documentOcrText,documentOcrProvider,ocrCpfMatched,reviewNote,createdAt,updatedAt")
    .eq("status", "PENDING_REVIEW")
    .order("createdAt", { ascending: false })
    .limit(20);
  if (isMissingSupabaseRelation(error)) return [];
  throwDbError(error);

  const rows = (data ?? []) as Array<any>;
  const users = await findUsersByIds([...new Set(rows.map((item) => item.userId).filter(Boolean))]);
  return Promise.all(rows.map(async (item) => ({
    ...item,
    user: users.get(item.userId) ?? null,
    documentSignedUrl: await resolvePrivateEvidenceUrl(item.documentUrl),
    selfieSignedUrl: await resolvePrivateEvidenceUrl(item.selfieUrl)
  })));
}

async function resolvePrivateEvidenceUrl(url: string | null | undefined) {
  if (!url) return null;
  const prefix = "supabase-private://report-evidence/";
  if (!url.startsWith(prefix)) return url;
  try {
    const path = decodeURIComponent(url.slice(prefix.length));
    const { data, error } = await db().storage.from("report-evidence").createSignedUrl(path, 10 * 60);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

async function findAdminUsers(searchBy: string, term: string) {
  const ownerIds = searchBy === "listing" || searchBy === "userListings" ? await findOwnerIdsByListingTerm(term) : [];
  let query = db()
    .from("User")
    .select("id,name,username,email,phone,whatsapp,role,accountBlockedAt,serviceBlockedAt,createdAt,identityVerifiedAt")
    .order("createdAt", { ascending: false })
    .limit(5);
  if (searchBy === "name" || searchBy === "fullName") query = query.ilike("name", like(term));
  else if (searchBy === "username") query = query.ilike("username", like(term));
  else if (searchBy === "email") query = query.ilike("email", like(term));
  else if (searchBy === "phone") query = query.or(`phone.ilike.${like(term)},whatsapp.ilike.${like(term)}`);
  else if (ownerIds.length) query = query.in("id", ownerIds);
  else query = query.or(`name.ilike.${like(term)},username.ilike.${like(term)},email.ilike.${like(term)},phone.ilike.${like(term)},whatsapp.ilike.${like(term)}`);
  const { data, error } = await query;
  throwDbError(error);
  return attachUserCounts((data ?? []) as Array<any>);
}

async function findRecentAdminUsers(period: string) {
  let query = db()
    .from("User")
    .select("id,name,username,email,phone,whatsapp,role,accountBlockedAt,serviceBlockedAt,createdAt,identityVerifiedAt")
    .order("createdAt", { ascending: false })
    .limit(5);
  const since = periodStart(period);
  if (since) query = query.gte("createdAt", since.toISOString());
  const { data, error } = await query;
  throwDbError(error);
  return attachUserCounts((data ?? []) as Array<any>);
}

async function attachUserCounts(users: Array<any>) {
  const ids = users.map((user: any) => user.id);
  const [listingCounts, reportCounts, planSummaries, latestPlanGrants, listingsByOwner] = await Promise.all([
    countGrouped("Listing", "ownerId", ids),
    countGrouped("TrustReport", "reporterId", ids),
    findUserPlanSummaries(ids),
    findLatestPlanGrants(ids),
    findListingsByOwnerIds(ids)
  ]);
  return users.map((user: any) => ({
    ...user,
    planSummary: planSummaries.get(user.id) ?? "",
    latestPlanGrant: latestPlanGrants.get(user.id) ?? null,
    listings: listingsByOwner.get(user.id) ?? [],
    _count: { listings: listingCounts.get(user.id) ?? 0, trustReports: reportCounts.get(user.id) ?? 0 }
  }));
}

async function findListingsByOwnerIds(ownerIds: string[]) {
  const grouped = new Map<string, Array<any>>();
  if (!ownerIds.length) return grouped;
  const { data, error } = await db()
    .from("Listing")
    .select("id,ownerId,title,slug,category,status,city,state,planId,createdAt,expiresAt")
    .in("ownerId", ownerIds)
    .order("createdAt", { ascending: false })
    .limit(80);
  throwDbError(error);
  const rows = (data ?? []) as Array<any>;
  const plans = await findPlansByIds([...new Set(rows.map((listing) => listing.planId).filter(Boolean))]);
  for (const listing of rows) {
    const current = grouped.get(listing.ownerId) ?? [];
    if (current.length < 12) {
      current.push({
        ...listing,
        plan: plans.get(listing.planId) ?? { name: "Grátis", code: "FREE" }
      });
    }
    grouped.set(listing.ownerId, current);
  }
  return grouped;
}

async function findAdminPlans() {
  const { data, error } = await db()
    .from("Plan")
    .select("id,name,code,durationDays,priceCents")
    .order("priceCents", { ascending: true });
  throwDbError(error);
  return data ?? [];
}

async function findUserPlanSummaries(userIds: string[]) {
  const summaries = new Map<string, string>();
  if (!userIds.length) return summaries;
  const { data, error } = await db()
    .from("Listing")
    .select("ownerId,planId,status,expiresAt")
    .in("ownerId", userIds)
    .in("status", ["ACTIVE", "PENDING_REVIEW", "EXPIRED"]);
  throwDbError(error);
  const listings = (data ?? []) as Array<any>;
  const plans = await findPlansByIds([...new Set(listings.map((listing) => listing.planId).filter(Boolean))]);
  const grouped = new Map<string, Map<string, { count: number; latestEndsAt: string | null }>>();
  for (const listing of listings) {
    const plan = plans.get(listing.planId) ?? { name: "Grátis", code: "FREE" };
    const current = grouped.get(listing.ownerId) ?? new Map<string, { count: number; latestEndsAt: string | null }>();
    const key = plan.name;
    const item = current.get(key) ?? { count: 0, latestEndsAt: null };
    item.count += 1;
    if (listing.expiresAt && (!item.latestEndsAt || new Date(listing.expiresAt) > new Date(item.latestEndsAt))) item.latestEndsAt = listing.expiresAt;
    current.set(key, item);
    grouped.set(listing.ownerId, current);
  }
  for (const [userId, plansByName] of grouped) {
    summaries.set(userId, [...plansByName.entries()].map(([name, item]) => `${name} (${item.count})${item.latestEndsAt ? ` até ${formatDate(item.latestEndsAt)}` : ""}`).join(" · "));
  }
  return summaries;
}

async function findLatestPlanGrants(userIds: string[]) {
  const grants = new Map<string, any>();
  if (!userIds.length) return grants;
  const { data, error } = await db()
    .from("AdminPlanGrant")
    .select("id,targetUserId,newPlanId,endsAt,reason,createdAt")
    .in("targetUserId", userIds)
    .order("createdAt", { ascending: false })
    .limit(100);
  if (isMissingSupabaseRelation(error)) return findLatestPlanGrantsFromAudit(userIds);
  throwDbError(error);
  const rows = (data ?? []) as Array<any>;
  const plans = await findPlansByIds([...new Set(rows.map((row) => row.newPlanId).filter(Boolean))]);
  for (const row of rows) {
    const grant = {
      ...row,
      planName: plans.get(row.newPlanId)?.name ?? "Plano"
    };
    setPreferredPlanGrant(grants, row.targetUserId, grant);
  }
  return grants;
}

async function findLatestPlanGrantsFromAudit(userIds: string[]) {
  const grants = new Map<string, any>();
  const { data, error } = await db()
    .from("AuditLog")
    .select("id,metadata,createdAt")
    .eq("action", "admin.user.grant_plan")
    .order("createdAt", { ascending: false })
    .limit(200);
  throwDbError(error);
  for (const row of (data ?? []) as Array<any>) {
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const targetUserId = typeof metadata.targetUserId === "string" ? metadata.targetUserId : "";
    if (!userIds.includes(targetUserId)) continue;
    const grant = {
      id: row.id,
      targetUserId,
      planName: typeof metadata.newPlanName === "string" ? metadata.newPlanName : "Plano",
      endsAt: typeof metadata.endsAt === "string" ? metadata.endsAt : row.createdAt,
      reason: typeof metadata.reason === "string" ? metadata.reason : "Registro administrativo",
      createdAt: row.createdAt
    };
    setPreferredPlanGrant(grants, targetUserId, grant);
  }
  return grants;
}

function setPreferredPlanGrant(grants: Map<string, any>, userId: string, grant: any) {
  const current = grants.get(userId);
  if (!current) {
    grants.set(userId, grant);
    return;
  }
  if (!isActivePlanGrant(current) && isActivePlanGrant(grant)) {
    grants.set(userId, grant);
  }
}

async function findAdminListings(searchBy: string, term: string, purpose?: RealEstatePurpose | "") {
  const listingTerm = extractListingTerm(term);
  const ownerIds = ["name", "fullName", "username", "email", "phone"].includes(searchBy) ? await findUserIdsByTerm(searchBy, term) : [];
  const realEstateIds = purpose ? await findRealEstateListingIdsByPurpose(purpose) : [];
  let query = db()
    .from("Listing")
    .select("id,title,slug,description,status,city,state,ownerId,planId,createdAt")
    .order("createdAt", { ascending: false })
    .limit(20);
  if (realEstateIds.length) query = query.in("id", realEstateIds);
  else if (purpose) return [];
  if (ownerIds.length) query = query.in("ownerId", ownerIds);
  else if (term) query = query.or(`slug.ilike.${like(listingTerm)},title.ilike.${like(term)},description.ilike.${like(term)}`);
  const { data, error } = await query;
  throwDbError(error);
  const listings = (data ?? []) as Array<any>;
  const [owners, plans] = await Promise.all([
    findUsersByIds([...new Set(listings.map((listing: any) => listing.ownerId).filter(Boolean))]),
    findPlansByIds([...new Set(listings.map((listing: any) => listing.planId).filter(Boolean))])
  ]);
  return listings.map((listing: any) => ({
    ...listing,
    owner: owners.get(listing.ownerId) ?? { name: "Usuário", username: null, email: "", phone: null, whatsapp: null },
    plan: plans.get(listing.planId) ?? { name: "Grátis", code: "FREE" }
  }));
}

async function findRealEstateListingIdsByPurpose(purpose: RealEstatePurpose) {
  const legacy = purpose === "SALE" ? "Venda" : purpose === "RENT" ? "Locação" : "Temporada";
  const { data, error } = await db().from("RealEstate").select("listingId").in("purpose", [purpose, legacy]);
  throwDbError(error);
  return (data ?? []).map((row: any) => row.listingId).filter(Boolean);
}

async function findAdminServices(search: string, status: string) {
  let query = db()
    .from("service_profiles")
    .select("id,user_id,name,razao_social,nome_fantasia,categoria_servico,cidade,estado,status,avaliacao_media,total_avaliacoes,denuncias_recebidas,complemento,updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);
  if (search) query = query.or(`name.ilike.${like(search)},razao_social.ilike.${like(search)},nome_fantasia.ilike.${like(search)},categoria_servico.ilike.${like(search)},cidade.ilike.${like(search)}`);
  if (status !== "ALL") query = query.eq("status", status);
  const { data, error } = await query;
  throwDbError(error);
  const rows = (data ?? []) as Array<any>;
  const [users, contactCounts, reviewCounts] = await Promise.all([
    findUsersByIds([...new Set(rows.map((row) => row.user_id).filter(Boolean))]),
    countGrouped("ServiceContact", "profileId", rows.map((row) => row.id)),
    countGrouped("ServiceReview", "profileId", rows.map((row) => row.id))
  ]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    companyLegalName: row.razao_social,
    companyTradeName: row.nome_fantasia,
    category: row.categoria_servico,
    city: row.cidade,
    state: row.estado,
    status: row.status,
    averageRating: row.avaliacao_media,
    totalRatings: row.total_avaliacoes,
    reportCount: row.denuncias_recebidas,
    billing: serviceBillingSummary(row.complemento),
    user: users.get(row.user_id) ?? { name: "Usuário", email: "", accountBlockedAt: null, serviceBlockedAt: null },
    _count: { contacts: contactCounts.get(row.id) ?? 0, reviews: reviewCounts.get(row.id) ?? 0 }
  }));
}

async function findSupportRequests(status: string) {
  try {
    let query = db()
      .from("SupportRequest")
      .select("id,userId,name,username,email,phone,whatsapp,category,subject,message,status,createdAt")
      .order("createdAt", { ascending: false })
      .limit(40);
    if (status !== "ALL") query = query.eq("status", status);
    const { data, error } = await query;
    throwDbError(error);
    return data ?? [];
  } catch (error) {
    if (isMissingSupabaseRelation(error)) return [];
    throw error;
  }
}

async function countSupportRequests(status: string) {
  try {
    const { count, error } = await db().from("SupportRequest").select("id", { count: "exact", head: true }).eq("status", status);
    throwDbError(error);
    return count ?? 0;
  } catch (error) {
    if (isMissingSupabaseRelation(error)) return 0;
    throw error;
  }
}

async function findUsersByIds(ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data, error } = await db().from("User").select("id,name,username,email,phone,whatsapp,accountBlockedAt,serviceBlockedAt").in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as Array<any>).map((user) => [user.id, user]));
}

async function findPlansByIds(ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data, error } = await db().from("Plan").select("id,name,code").in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as Array<any>).map((plan) => [plan.id, plan]));
}

async function findOwnerIdsByListingTerm(term: string) {
  const listingTerm = extractListingTerm(term);
  const { data, error } = await db()
    .from("Listing")
    .select("ownerId")
    .or(`slug.ilike.${like(listingTerm)},title.ilike.${like(term)},description.ilike.${like(term)}`)
    .limit(100);
  throwDbError(error);
  return [...new Set(((data ?? []) as Array<any>).map((listing) => listing.ownerId).filter(Boolean))];
}

async function findUserIdsByTerm(searchBy: string, term: string) {
  let query = db().from("User").select("id").limit(100);
  if (searchBy === "name" || searchBy === "fullName") query = query.ilike("name", like(term));
  else if (searchBy === "username") query = query.ilike("username", like(term));
  else if (searchBy === "email") query = query.ilike("email", like(term));
  else if (searchBy === "phone") query = query.or(`phone.ilike.${like(term)},whatsapp.ilike.${like(term)}`);
  const { data, error } = await query;
  throwDbError(error);
  return ((data ?? []) as Array<{ id: string }>).map((user) => user.id);
}

async function countGrouped(table: string, column: string, ids: string[]) {
  const counts = new Map<string, number>();
  if (!ids.length) return counts;
  const { data, error } = await db().from(table).select(column).in(column, ids);
  throwDbError(error);
  for (const row of (data ?? []) as unknown as Array<Record<string, string>>) {
    const id = row[column];
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function like(term: string) {
  return `%${term.replace(/[%_,]/g, "").trim()}%`;
}
function userSearchWhere(searchBy: string, term: string) {
  const contains = { contains: term, mode: "insensitive" as const };
  const listingTerm = extractListingTerm(term);
  const listingContains = { contains: listingTerm, mode: "insensitive" as const };

  if (searchBy === "name" || searchBy === "fullName") {
    return { name: contains };
  }

  if (searchBy === "username") {
    return { username: contains };
  }

  if (searchBy === "email") {
    return { email: contains };
  }

  if (searchBy === "phone") {
    return { OR: [{ phone: contains }, { whatsapp: contains }] };
  }

  if (searchBy === "listing" || searchBy === "userListings") {
    return {
      listings: {
        some: {
          OR: [
            { slug: listingContains },
            { title: contains },
            { description: contains }
          ]
        }
      }
    };
  }

  return {
    OR: [
      { name: contains },
      { username: contains },
      { email: contains },
      { phone: contains },
      { whatsapp: contains },
      {
        listings: {
          some: {
            OR: [
              { slug: listingContains },
              { title: contains },
              { description: contains }
            ]
          }
        }
      }
    ]
  };
}

function listingSearchWhere(searchBy: string, term: string) {
  const contains = { contains: term, mode: "insensitive" as const };
  const listingTerm = extractListingTerm(term);
  const listingContains = { contains: listingTerm, mode: "insensitive" as const };

  if (searchBy === "name" || searchBy === "fullName") {
    return { owner: { name: contains } };
  }

  if (searchBy === "username") {
    return { owner: { username: contains } };
  }

  if (searchBy === "email") {
    return { owner: { email: contains } };
  }

  if (searchBy === "phone") {
    return { OR: [{ owner: { phone: contains } }, { owner: { whatsapp: contains } }] };
  }

  if (searchBy === "listing" || searchBy === "userListings") {
    return {
      OR: [
        { slug: listingContains },
        { title: contains },
        { description: contains },
        { owner: { name: contains } },
        { owner: { username: contains } },
        { owner: { email: contains } }
      ]
    };
  }

  return {
    OR: [
      { slug: listingContains },
      { title: contains },
      { description: contains },
      { owner: { name: contains } },
      { owner: { username: contains } },
      { owner: { email: contains } },
      { owner: { phone: contains } },
      { owner: { whatsapp: contains } }
    ]
  };
}

function extractListingTerm(value: string) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? value;
  } catch {
    return value.split("?")[0].split("#")[0].split("/").filter(Boolean).at(-1) ?? value;
  }
}

function Metric({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <>
      <p className="text-[11px] font-bold uppercase leading-tight text-neutral-400">{label}</p>
      <strong className="mt-1 block text-xl leading-none sm:text-2xl">{value}</strong>
      {href ? <span className="mt-1 block text-[10px] font-black uppercase text-yellow-300">Ver Detalhes</span> : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className="min-h-[76px] rounded-md border border-white/10 bg-neutral-950 px-3 py-2.5 transition hover:border-yellow-300/60 hover:bg-yellow-300/10 active:scale-[0.98]">
        {content}
      </a>
    );
  }

  return (
    <div className="min-h-[76px] rounded-md border border-white/10 bg-neutral-950 px-3 py-2.5">
      {content}
    </div>
  );
}

function SectionTitle({ title, text }: { title: string; text?: string }) {
  return (
    <div>
      <h2 className="text-xl font-black">{title}</h2>
      {text ? <p className="mt-1 text-sm text-neutral-400">{text}</p> : null}
    </div>
  );
}

function ServiceAdminCard({ service, canManage }: { service: any; canManage: boolean }) {
  const title = service.companyTradeName ?? service.companyLegalName ?? service.name ?? service.user.name;
  const billing = service.billing.billing;
  const providerEnabled = !service.user.serviceBlockedAt;
  const accountEnabled = !service.user.accountBlockedAt;

  return (
    <details className="group overflow-hidden rounded-lg border border-white/10 bg-black/30 text-sm">
      <summary className="grid cursor-pointer list-none gap-3 bg-white/[0.03] p-4 transition hover:bg-yellow-300/[0.06] sm:grid-cols-[1fr_auto] [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black">{title}</h3>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${service.status === "ACTIVE" ? "bg-emerald-400/15 text-emerald-200" : "bg-yellow-400/15 text-yellow-200"}`}>{service.status}</span>
          </div>
          <p className="mt-1 text-neutral-400">{service.category} · {service.city}/{service.state}</p>
          <p className="mt-1 text-neutral-300">Plano: <strong className="text-white">{billing.planCode}</strong> · válido até {formatDate(billing.currentPeriodEndsAt)}</p>
        </div>
        <div className="flex items-center justify-start sm:justify-end">
          <span className="rounded-full px-5 py-2 text-sm font-black btn-gold group-open:hidden">Abrir Gestão</span>
          <span className="hidden rounded-full border border-white/10 px-5 py-2 text-sm font-black text-white group-open:inline-flex">Fechar Gestão</span>
        </div>
      </summary>

      <div className="border-t border-white/10 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Nota" value={`${service.averageRating}/5`} />
          <MiniStat label="Avaliações" value={service.totalRatings} />
          <MiniStat label="Contatos" value={service._count.contacts} />
          <MiniStat label="Denúncias" value={service.reportCount} />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-neutral-950 p-3">
            <p className="text-xs font-black uppercase text-yellow-300">Acesso e moderação</p>
            <p className="mt-2 text-neutral-300">Prestador: <strong className="text-white">{providerEnabled ? "Liberado" : "Bloqueado"}</strong></p>
            <p className="mt-1 text-neutral-300">Conta principal: <strong className="text-white">{accountEnabled ? "Liberada" : "Bloqueada"}</strong></p>
            <ActionRow>
              <AdminForm action="validate_service" profileId={service.id} label="Validar" />
              <AdminForm action="pause_service" profileId={service.id} label="Pausar" />
              <AdminForm action="archive_service" profileId={service.id} label="Arquivar" />
              {canManage ? <AdminForm action="block_service_provider" profileId={service.id} label="Bloquear Prestador" /> : null}
              {canManage ? <AdminForm action="unblock_service_provider" profileId={service.id} label="Liberar Prestador" /> : null}
            </ActionRow>
          </div>

          <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/[0.04] p-3">
            <p className="text-xs font-black uppercase text-yellow-300">Plano profissional</p>
            <p className="mt-2 text-neutral-300">Plano: <strong className="text-white">{billing.planCode}</strong></p>
            <p className="mt-1 text-neutral-300">Cobrança: <strong className="text-white">{billing.status}</strong></p>
            <p className="mt-1 text-neutral-300">Validade: <strong className="text-white">{formatDate(billing.currentPeriodEndsAt)}</strong></p>
            <p className="mt-1 text-neutral-300">Renovação: <strong className="text-white">{formatCurrency(billing.renewalPriceCents)}</strong></p>
            <Link href={`/admin/prestadores/${service.id}`} className="mt-3 inline-flex h-10 items-center rounded-full border border-yellow-300/40 px-4 font-black text-yellow-200 hover:bg-yellow-300 hover:text-black">Ver cadastro completo</Link>
          </div>
        </div>

        {canManage ? (
          <details className="mt-4 rounded-lg border border-red-500/40 bg-red-950/20 p-3">
            <summary className="cursor-pointer font-black text-red-300">Excluir Prestador</summary>
            <form action="/api/admin/actions" method="POST" className="mt-3 grid gap-2 rounded-md border border-white/10 bg-black/30 p-3">
              <input type="hidden" name="action" value="delete_service_profile" />
              <input type="hidden" name="profileId" value={service.id} />
              <label className="flex gap-2 text-xs text-neutral-300"><input type="checkbox" name="confirmDelete" value="SIM" required />Confirmo a exclusão do perfil profissional. A conta principal será mantida.</label>
              <button className="rounded-full bg-[#ff2800] px-4 py-2 font-black text-white">Excluir Só o Prestador</button>
            </form>
          </details>
        ) : null}
      </div>
    </details>
  );
}

function UserAdminCard({ user, allPlans, canManage }: { user: any; allPlans: Array<any>; canManage: boolean }) {
  const accountEnabled = !user.accountBlockedAt;
  const contentEnabled = !user.serviceBlockedAt;
  const fullyBlocked = Boolean(user.accountBlockedAt && user.serviceBlockedAt);
  const currentPlan = effectiveUserPlanSummary(user);
  const latestGrantText = user.latestPlanGrant ? `${user.latestPlanGrant.planName} até ${formatDate(user.latestPlanGrant.endsAt)}` : "Nenhuma registrada";

  return (
    <details className="group overflow-hidden rounded-lg border border-white/10 bg-black/30 text-sm">
      <summary className="grid cursor-pointer list-none gap-3 bg-white/[0.03] p-4 transition hover:bg-yellow-300/[0.06] sm:grid-cols-[1fr_auto] [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black">{user.name}</h3>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${accountEnabled ? "bg-emerald-400/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
              {accountEnabled ? "Liberado" : "Bloqueado"}
            </span>
          </div>
          <p className="mt-1 text-neutral-400">Username: {user.username ?? "Não informado"}</p>
          <p className="mt-1 text-neutral-300">Plano atual: <strong className="text-white">{currentPlan}</strong></p>
        </div>
        <div className="flex items-center justify-start sm:justify-end">
          <span className="rounded-full px-5 py-2 text-sm font-black btn-gold group-open:hidden">Abrir Gestão</span>
          <span className="hidden rounded-full border border-white/10 px-5 py-2 text-sm font-black text-white group-open:inline-flex">Fechar Gestão</span>
        </div>
      </summary>

      <div className="border-t border-white/10">
        <div className="grid gap-4 bg-white/[0.03] p-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">{user.name}</h3>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ${accountEnabled ? "bg-emerald-400/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
                {accountEnabled ? "Conta Liberada" : "Conta Bloqueada"}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-black text-neutral-200">{user.role}</span>
            </div>
            <p className="mt-1 text-neutral-400">{user.email} · {formatPhone(user.phone ?? user.whatsapp) || "Sem telefone"}</p>
            <p className="text-neutral-400">Username: {user.username ?? "Não informado"} · Verificado: {user.identityVerifiedAt ? "Sim" : "Não"}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
            <MiniStat label="Anúncios" value={user._count.listings} />
            <MiniStat label="Denúncias" value={user._count.trustReports} />
            <MiniStat label="Serviços" value={contentEnabled ? "ON" : "OFF"} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="grid gap-3">
          <div className="rounded-lg border border-white/10 bg-neutral-950 p-3">
            <p className="text-xs font-black uppercase text-yellow-300">Resumo do usuário</p>
            <p className="mt-2 text-neutral-300">Plano vigente: <strong className="text-white">{currentPlan}</strong></p>
            <p className="mt-1 text-neutral-300">Última cortesia: <strong className="text-white">{latestGrantText}</strong></p>
            {user.latestPlanGrant?.reason ? <p className="mt-1 text-xs text-neutral-500">Motivo: {user.latestPlanGrant.reason}</p> : null}
          </div>

          {canManage ? (
            <div className="rounded-lg border border-white/10 bg-neutral-950 p-3">
              <p className="text-xs font-black uppercase text-yellow-300">Controle rápido ON/OFF</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <ToggleActionForm
                  label="Login"
                  enabled={accountEnabled}
                  enabledText="ON"
                  disabledText="OFF"
                  action={accountEnabled ? "user_suspend" : "user_reactivate"}
                  targetUserId={user.id}
                />
                <ToggleActionForm
                  label="Anúncios e Serviços"
                  enabled={contentEnabled}
                  enabledText="ON"
                  disabledText="OFF"
                  action={contentEnabled ? "user_pause_content" : "user_reactivate"}
                  targetUserId={user.id}
                />
                <ToggleActionForm
                  label="Bloqueio TOTAL"
                  enabled={fullyBlocked}
                  enabledText="ON"
                  disabledText="OFF"
                  action={fullyBlocked ? "user_reactivate" : "user_block"}
                  targetUserId={user.id}
                  danger
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-white/10 bg-neutral-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase text-yellow-300">Anúncios do usuário</p>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-black text-neutral-300">{user._count.listings} total</span>
            </div>
            <div className="mt-3 grid gap-2">
              {(user.listings ?? []).map((listing: any) => (
                <div key={listing.id} className="rounded-md border border-white/10 bg-black/35 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-black text-white">{listing.title}</p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {listing.category} · {listing.city || "Cidade não informada"}{listing.state ? `/${listing.state}` : ""} · {listing.plan?.name ?? "Grátis"}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-500">Criado em {formatDate(listing.createdAt)}{listing.expiresAt ? ` · expira em ${formatDate(listing.expiresAt)}` : ""}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${adminListingStatusClass(listing.status)}`}>{adminListingStatusLabel(listing.status)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/anuncios/${listing.slug}`} className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white hover:bg-white hover:text-black">Abrir</Link>
                    <Link href={`/dashboard/anuncios/${listing.slug}/editar`} className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-black text-emerald-200 hover:bg-emerald-400 hover:text-black">Editar</Link>
                    <AdminForm action="remove_listing" listingId={listing.id} returnTo="/admin#usuarios" label="Excluir" />
                    {listing.status !== "ACTIVE" ? <AdminForm action="restore_listing" listingId={listing.id} returnTo="/admin#usuarios" label="Restaurar" /> : null}
                  </div>
                </div>
              ))}
              {!(user.listings ?? []).length ? <p className="text-sm text-neutral-500">Este usuário ainda não possui anúncios.</p> : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/[0.04] p-3">
          <p className="text-xs font-black uppercase text-yellow-300">Plano, promoção ou cortesia</p>
          <div className="mt-2 rounded-md border border-white/10 bg-black/35 p-3">
            <p className="text-[11px] font-black uppercase text-neutral-500">Plano atual</p>
            <p className="mt-1 font-black text-white">{currentPlan}</p>
            <p className="mt-1 text-xs text-neutral-500">Ao aplicar um novo plano, a validade será a duração real cadastrada nesse plano.</p>
          </div>
          {canManage ? (
            <form action="/api/admin/actions" method="POST" className="mt-3 grid gap-2">
              <input type="hidden" name="action" value="grant_user_plan" />
              <input type="hidden" name="targetUserId" value={user.id} />
              <select name="planId" required className="input">
                <option value="">Escolha o novo plano</option>
                {allPlans.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>{plan.name} ({plan.code}) · {Math.max(Number(plan.durationDays ?? 0), 1)} dias</option>
                ))}
              </select>
              <input name="reason" required placeholder="Motivo: promoção, cortesia, suporte..." className="input" />
              <button className="h-11 rounded-full px-5 btn-gold">Aplicar Plano ao Usuário</button>
              <p className="text-xs text-neutral-500">Aplica em todos os anúncios ativos, pendentes ou expirados. Se o usuário ainda não tiver anúncio elegível, o plano concedido fica como plano vigente no resumo administrativo.</p>
            </form>
          ) : (
            <p className="mt-2 text-sm text-neutral-400">Somente Super Admin pode alterar plano e acesso.</p>
          )}

          {canManage ? (
            <form action="/api/admin/actions" method="POST" className="mt-4 grid gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3">
              <input type="hidden" name="action" value="grant_banner_plan" />
              <input type="hidden" name="targetUserId" value={user.id} />
              <p className="text-xs font-black uppercase text-emerald-200">Cortesia de banner patrocinado</p>
              <select name="bannerPlanType" required className="input">
                <option value="">Escolha o plano de banner</option>
                <option value="TOP_15">TOP 15 · 1 banner por 15 dias</option>
                <option value="TOP_30">TOP 30 · 1 banner por 30 dias</option>
              </select>
              <input name="reason" required placeholder="Motivo da cortesia de banner..." className="input" />
              <button className="h-11 rounded-full bg-[#22C55E] px-5 font-black text-black hover:bg-[#34D399]">
                Liberar Banner Cortesia
              </button>
              <p className="text-xs text-neutral-500">
                Cria um banner ativo de cortesia. O usuário poderá editar imagem, título e link em Meus banners durante o período liberado.
              </p>
            </form>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function UserRiskActions({ targetUserId }: { targetUserId: string }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <form action="/api/admin/actions" method="POST" className="grid gap-2 rounded-md border border-red-400/25 bg-black/35 p-3">
        <input type="hidden" name="action" value="user_block" />
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <input name="note" placeholder="Motivo do bloqueio" className="input" />
        <button className="rounded-full border border-red-300/40 px-4 py-2 text-sm font-black text-red-100 hover:bg-red-500 hover:text-white">
          Bloquear usuário
        </button>
      </form>
      <form action="/api/admin/actions" method="POST" className="grid gap-2 rounded-md border border-red-500/40 bg-red-950/20 p-3">
        <input type="hidden" name="action" value="user_delete" />
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <input name="note" placeholder="Motivo da exclusão" className="input" />
        <label className="flex items-start gap-2 text-xs text-neutral-300">
          <input type="checkbox" name="confirmDelete" value="EXCLUIR" required className="mt-1" />
          Confirmo remover este usuário da operação pública do Achei X.
        </label>
        <button className="rounded-full bg-[#ff2800] px-4 py-2 text-sm font-black text-white">
          Excluir usuário
        </button>
      </form>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
      <p className="text-[10px] font-black uppercase text-neutral-500">{label}</p>
      <strong className="mt-1 block text-base text-white">{value}</strong>
    </div>
  );
}

function effectiveUserPlanSummary(user: any) {
  if (user.latestPlanGrant && isActivePlanGrant(user.latestPlanGrant)) {
    return `${user.latestPlanGrant.planName} até ${formatDate(user.latestPlanGrant.endsAt)}`;
  }
  return user.planSummary || "Sem planos ativos";
}

function isActivePlanGrant(grant: any) {
  const endsAt = grant?.endsAt ? new Date(grant.endsAt) : null;
  return Boolean(endsAt && Number.isFinite(endsAt.getTime()) && endsAt.getTime() >= Date.now());
}

function adminListingStatusLabel(status: string) {
  if (status === "ACTIVE") return "Ativo";
  if (status === "PENDING_REVIEW") return "Em análise";
  if (status === "EXPIRED") return "Expirado";
  if (status === "REJECTED") return "Rejeitado";
  if (status === "SOLD") return "Vendido";
  if (status === "RENTED") return "Alugado";
  return status;
}

function adminListingStatusClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-400/15 text-emerald-200";
  if (status === "PENDING_REVIEW") return "bg-yellow-400/15 text-yellow-200";
  if (status === "EXPIRED") return "bg-neutral-500/20 text-neutral-200";
  if (status === "REJECTED") return "bg-red-500/15 text-red-200";
  return "bg-sky-400/15 text-sky-200";
}

function ToggleActionForm({
  label,
  enabled,
  enabledText,
  disabledText,
  action,
  targetUserId,
  danger = false
}: {
  label: string;
  enabled: boolean;
  enabledText: string;
  disabledText: string;
  action: string;
  targetUserId: string;
  danger?: boolean;
}) {
  const activeClass = danger ? "bg-red-500" : "bg-emerald-400";
  return (
    <form action="/api/admin/actions" method="POST" className="rounded-md border border-white/10 bg-black/35 p-2">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <button className="flex w-full items-center justify-between gap-3 text-left" aria-pressed={enabled}>
        <span>
          <span className="block text-sm font-black text-white">{label}</span>
          <span className="text-xs text-neutral-500">Toque para mudar</span>
        </span>
        <span className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full p-1 transition ${enabled ? activeClass : "bg-neutral-700"}`}>
          <span className={`h-6 w-6 rounded-full bg-white transition ${enabled ? "translate-x-8" : "translate-x-0"}`} />
          <span className={`absolute text-[10px] font-black text-black ${enabled ? "left-2" : "right-2 text-white"}`}>{enabled ? enabledText : disabledText}</span>
        </span>
      </button>
    </form>
  );
}

function AdminActions({ caseId }: { caseId: string }) {
  return (
    <form action="/api/admin/actions" method="POST" className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
      <input type="hidden" name="caseId" value={caseId} />
      <input name="note" placeholder="Nota da moderação (opcional)" className="input" />
      <button name="action" value="approve_report" className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-black">Aprovar</button>
      <button name="action" value="reject_report" className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">Rejeitar</button>
      <button name="action" value="request_review" className="rounded-full bg-yellow-300 px-4 py-2 text-sm font-black text-black">Solicitar Revisão</button>
    </form>
  );
}

function ActionRow({ children, hidden = false }: { children: React.ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return <div className="mt-3 flex flex-wrap gap-2 md:mt-0">{children}</div>;
}

function AdminForm({ action, label, ...values }: { action: string; label: string; [key: string]: string }) {
  return (
    <form action="/api/admin/actions" method="POST">
      <input type="hidden" name="action" value={action} />
      {Object.entries(values).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white hover:bg-white hover:text-black">{label}</button>
    </form>
  );
}

function riskLabel(score: number) {
  if (score >= 300) return "Bloqueio Automático";
  if (score >= 200) return "Suspensão Temporária";
  if (score >= 100) return "Revisão";
  if (score >= 50) return "Em Observação";
  return "Confiável";
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}

function maskCpf(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return "Não informado";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

function supportCategoryLabel(value: string) {
  const labels: Record<string, string> = {
    SUPORTE: "Suporte",
    CONTA: "Conta",
    ANUNCIO: "Anúncio",
    PAGAMENTO: "Pagamento",
    APP: "Aplicativo",
    OUTRO: "Outro"
  };
  return labels[value] ?? value;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizePeriod(value: string | undefined, fallback: "day" | "week" | "month" | "all") {
  return value === "day" || value === "week" || value === "month" || value === "all" ? value : fallback;
}

function isMissingSupabaseRelation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "42P01" || code === "PGRST205";
}

function periodStart(period?: string) {
  const now = new Date();
  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "week") return new Date(now.getTime() - 7 * 86400000);
  if (period === "month") return new Date(now.getTime() - 30 * 86400000);
  return null;
}







