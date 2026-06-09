import Link from "next/link";
import { requireBackofficePageUser } from "@/lib/admin-auth";
import { AdminSystemMonitor } from "@/components/admin-system-monitor";
import { AdminFinancePanel } from "@/components/admin-finance-panel";
import { LogoutButton } from "@/components/logout-button";
import { money } from "@/components/listing-card";
import { db, throwDbError } from "@/lib/supabase-db";
import { formatPhone } from "@/lib/formatters";
import { getFinanceData, parseFinanceRange } from "@/lib/admin-finance";
import { getMessageSafetyAdminConfig } from "@/lib/message-safety";

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
    financeStart?: string;
    financeEnd?: string;
  };
}) {
  const admin = await requireBackofficePageUser();
  const statusFilter = searchParams?.status;
  const categoryFilter = searchParams?.category;
  const userSearchBy = searchParams?.userSearchBy ?? "name";
  const userSearch = searchParams?.userSearch?.trim() ?? "";
  const hasUserSearch = userSearch.length > 0;
  const listingSearchBy = searchParams?.listingSearchBy ?? "listing";
  const listingSearch = searchParams?.listingSearch?.trim() ?? "";
  const hasListingSearch = listingSearch.length > 0;
  const financeRange = parseFinanceRange(searchParams?.financeStart, searchParams?.financeEnd);
  const trustWhere = {
    ...(statusFilter && statusFilter !== "TODOS" ? { status: statusFilter as any } : {}),
    ...(categoryFilter && categoryFilter !== "TODOS" ? { targetType: categoryFilter as any } : {})
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
    listings,
    services,
    financeData,
    messageSafetyConfig
  ] = await Promise.all([
    countRows("User"),
    countRows("Listing"),
    countRows("service_profiles"),
    countRows("TrustReport"),
    countRows("AuditLog", (query) => query.ilike("action", "%user_block%")),
    countRows("Listing", (query) => query.eq("status", "ACTIVE")),
    countRows("Listing", (query) => query.eq("status", "PENDING_REVIEW")),
    getPaymentAggregate(),
    findTrustCases(trustWhere),
    hasUserSearch ? findAdminUsers(userSearchBy, userSearch) : Promise.resolve([]),
    hasListingSearch ? findAdminListings(listingSearchBy, listingSearch) : Promise.resolve([]),
    findAdminServices(),
    getFinanceData(financeRange),
    getMessageSafetyAdminConfig()
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
          {["Dashboard", "Denúncias", "Usuários", "Anúncios", "Serviços", "Financeiro", ...(admin.adminAccessLevel === "SUPER_ADMIN" ? ["Segurança", "Sistema"] : [])].map((item) => (
            <a key={item} href={`#${slugify(item)}`} className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-yellow-300 hover:text-black">
              {item}
            </a>
          ))}
        </nav>

        <section id="dashboard" className="mt-5 grid scroll-mt-24 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Usuários" value={totalUsers} href="#usuarios" />
          <Metric label="Anúncios" value={totalListings} href="#anuncios" />
          <Metric label="Prestadores" value={totalServices} href="#servicos" />
          <Metric label="Reportes" value={totalReports} href="#denuncias" />
          <Metric label="Bloqueios Registrados" value={blockedActions} href="#usuarios" />
          <Metric label="Anúncios Ativos" value={activeListings} href="#anuncios" />
          <Metric label="Em Análise" value={pendingListings} href="#anuncios" />
          <Metric label="Pagamentos" value={totalPayments._count} href="#financeiro" />
          <Metric label="Receita Registrada" value={money(totalPayments._sum.amountCents ?? 0)} href="#financeiro" />
          <Metric label="Casos Abertos" value={trustCases.length} href="#denuncias" />
        </section>

        <section id="denuncias" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Central de Denúncias" text="Fila de análise com histórico, evidências e decisões." />
          <form className="mt-4 flex flex-wrap gap-2">
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
          <SectionTitle title="Gestão de Usuários" />
          <form className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 md:grid-cols-[220px_1fr_auto]">
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            {categoryFilter ? <input type="hidden" name="category" value={categoryFilter} /> : null}
            <select name="userSearchBy" defaultValue={userSearchBy} className="input">
              <option value="name">Nome</option>
              <option value="fullName">Nome Completo</option>
              <option value="username">Username</option>
              <option value="email">Email</option>
              <option value="phone">Telefone</option>
              <option value="listing">Link do Anúncio</option>
            </select>
            <input name="userSearch" defaultValue={userSearch} placeholder="Digite aqui para buscar" className="input" />
            <button className="rounded-full px-5 btn-gold">Buscar</button>
          </form>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {users.map((user: any) => (
              <article key={user.id} className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm">
                <h3 className="font-black">{user.name}</h3>
                <p className="text-neutral-400">{user.email}</p>
                <p className="text-neutral-400">Username: {user.username ?? "Não Informado"}</p>
                <p className="text-neutral-400">Telefone: {formatPhone(user.phone ?? user.whatsapp) || "Não Informado"}</p>
                <p className="mt-2 text-neutral-300">Perfil: {user.role} · Anúncios: {user._count.listings} · Reportes Enviados: {user._count.trustReports}</p>
                <p className="text-neutral-300">Conta: {user.accountBlockedAt ? "Bloqueada" : "Liberada"} · Serviços: {user.serviceBlockedAt ? "Bloqueado" : "Liberado"}</p>
                <p className="text-neutral-300">Verificado: {user.identityVerifiedAt ? "Sim" : "Não"}</p>
                <ActionRow hidden={admin.adminAccessLevel !== "SUPER_ADMIN"}>
                  <AdminForm action="user_suspend" targetUserId={user.id} label="Suspender" />
                  <AdminForm action="user_block" targetUserId={user.id} label="Bloquear" />
                  <AdminForm action="user_reactivate" targetUserId={user.id} label="Reativar" />
                </ActionRow>
              </article>
            ))}
            {hasUserSearch && !users.length ? <p className="text-sm text-neutral-400">Nenhum usuário encontrado.</p> : null}
          </div>
        </section>

        <section id="anuncios" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Gestão de Anúncios" />
          <form className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 md:grid-cols-[220px_1fr_auto]">
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

        <section id="servicos" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <SectionTitle title="Gestão de Prestadores" text="Validar cadastro, ver reputação e aplicar penalidades." />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {services.map((service: any) => (
              <article key={service.id} className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm">
                <h3 className="font-black"><Link href={`/admin/prestadores/${service.id}`} className="text-white underline decoration-yellow-300/60 underline-offset-4 transition hover:text-yellow-300">{service.companyTradeName ?? service.companyLegalName ?? service.name ?? service.user.name}</Link></h3>
                <p className="text-neutral-400">{service.category} · {service.city}/{service.state}</p>
                <p className="mt-2 text-neutral-300">Status: {service.status} · Nota: {service.averageRating}/5 · Avaliações: {service.totalRatings}</p>
                <p className="text-neutral-300">Contatos: {service._count.contacts} · Reviews: {service._count.reviews} · Reportes: {service.reportCount}</p>
                <p className="text-neutral-300">Prestador: {service.user.serviceBlockedAt ? "Bloqueado" : "Liberado"} · Conta: {service.user.accountBlockedAt ? "Bloqueada" : "Liberada"}</p>
                <ActionRow>
                  <AdminForm action="validate_service" profileId={service.id} label="Validar" />
                  <AdminForm action="pause_service" profileId={service.id} label="Pausar" />
                  <AdminForm action="archive_service" profileId={service.id} label="Arquivar" />
                  <AdminForm action="block_service_provider" profileId={service.id} label="Bloquear Prestador" />
                  <AdminForm action="unblock_service_provider" profileId={service.id} label="Liberar Prestador" />
                </ActionRow>
                {admin.adminAccessLevel === "SUPER_ADMIN" ? (
                  <details className="mt-4 rounded-lg border border-red-500/40 bg-red-950/20 p-3">
                    <summary className="cursor-pointer text-sm font-black text-red-300">Excluir Prestador</summary>
                    <div className="mt-3 grid gap-3 text-sm text-neutral-200">
                      <p>Regra de Ouro: isso fecha o perfil profissional e bloqueia novos serviços até o Admin liberar. A conta principal continua ativa.</p>
                      <form action="/api/admin/actions" method="POST" className="grid gap-2 rounded-md border border-white/10 bg-black/30 p-3">
                        <input type="hidden" name="action" value="delete_service_profile" />
                        <input type="hidden" name="profileId" value={service.id} />
                        <label className="flex gap-2 text-xs text-neutral-300">
                          <input type="checkbox" name="confirmDelete" value="SIM" required />
                          Confirmo que quero excluir o perfil profissional e bloquear novos serviços.
                        </label>
                        <button className="rounded-full bg-[#ff2800] px-4 py-2 text-sm font-black text-white">Excluir Só o Prestador</button>
                      </form>
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
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

async function getPaymentAggregate() {
  const { data, error } = await db().from("Payment").select("amountCents");
  throwDbError(error);
  const rows = (data ?? []) as Array<{ amountCents: number }>;
  return { _sum: { amountCents: rows.reduce((sum, row) => sum + (row.amountCents ?? 0), 0) }, _count: rows.length };
}

async function findTrustCases(filters: { status?: string; targetType?: string }) {
  let query = db()
    .from("TrustCase")
    .select("id,targetUserId,targetType,listingId,serviceId,riskScore,riskLevel,status,requiresHumanReview,preventiveAction,updatedAt")
    .order("requiresHumanReview", { ascending: false })
    .order("updatedAt", { ascending: false })
    .limit(30);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.targetType) query = query.eq("targetType", filters.targetType);
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
  for (const report of reports) {
    const current = grouped.get(report.caseId) ?? [];
    if (current.length < 5) current.push({ ...report, reporter: reporters.get(report.reporterId) ?? { name: "Usuário", email: "" } });
    grouped.set(report.caseId, current);
  }
  return grouped;
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

async function findAdminUsers(searchBy: string, term: string) {
  const ownerIds = searchBy === "listing" || searchBy === "userListings" ? await findOwnerIdsByListingTerm(term) : [];
  let query = db()
    .from("User")
    .select("id,name,username,email,phone,whatsapp,role,accountBlockedAt,serviceBlockedAt,createdAt,identityVerifiedAt")
    .order("createdAt", { ascending: false })
    .limit(20);
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

async function attachUserCounts(users: Array<any>) {
  const ids = users.map((user: any) => user.id);
  const [listingCounts, reportCounts] = await Promise.all([
    countGrouped("Listing", "ownerId", ids),
    countGrouped("TrustReport", "reporterId", ids)
  ]);
  return users.map((user: any) => ({ ...user, _count: { listings: listingCounts.get(user.id) ?? 0, trustReports: reportCounts.get(user.id) ?? 0 } }));
}

async function findAdminListings(searchBy: string, term: string) {
  const listingTerm = extractListingTerm(term);
  const ownerIds = ["name", "fullName", "username", "email", "phone"].includes(searchBy) ? await findUserIdsByTerm(searchBy, term) : [];
  let query = db()
    .from("Listing")
    .select("id,title,slug,description,status,city,state,ownerId,planId,createdAt")
    .order("createdAt", { ascending: false })
    .limit(20);
  if (ownerIds.length) query = query.in("ownerId", ownerIds);
  else query = query.or(`slug.ilike.${like(listingTerm)},title.ilike.${like(term)},description.ilike.${like(term)}`);
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

async function findAdminServices() {
  const { data, error } = await db()
    .from("service_profiles")
    .select("id,user_id,name,razao_social,nome_fantasia,categoria_servico,cidade,estado,status,avaliacao_media,total_avaliacoes,denuncias_recebidas,updated_at")
    .order("updated_at", { ascending: false })
    .limit(12);
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
    user: users.get(row.user_id) ?? { name: "Usuário", email: "", accountBlockedAt: null, serviceBlockedAt: null },
    _count: { contacts: contactCounts.get(row.id) ?? 0, reviews: reviewCounts.get(row.id) ?? 0 }
  }));
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}







