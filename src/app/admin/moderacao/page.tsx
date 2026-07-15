import Link from "next/link";
import { requireBackofficePageUser } from "@/lib/admin-auth";
import { db, throwDbError } from "@/lib/supabase-db";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function AdminModeracaoPage({
  searchParams
}: {
  searchParams?: { q?: string; cpfStatus?: string };
}) {
  const admin = await requireBackofficePageUser();
  const q = searchParams?.q?.trim() ?? "";
  const cpfStatus = searchParams?.cpfStatus ?? "PENDING_REVIEW";
  const [cpfRequests, users] = await Promise.all([
    findCpfRequests(cpfStatus),
    q ? findUsers(q) : findUsersForReview()
  ]);

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-lg border border-white/10 bg-neutral-950 p-5">
          <Link href="/admin" className="text-sm font-black text-yellow-300">Voltar ao Admin</Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-yellow-300">Backoffice Achei X</p>
              <h1 className="mt-1 text-3xl font-black">Central de Moderação</h1>
              <p className="mt-1 text-sm text-neutral-400">Analise documentos, perfis suspeitos e aja rápido sem poluir o painel principal.</p>
            </div>
            <span className="rounded-full border border-yellow-300/30 px-4 py-2 text-sm font-black text-yellow-200">
              {admin.adminAccessLevel === "SUPER_ADMIN" ? "Super Admin" : "Moderador"} · {admin.name}
            </span>
          </div>
        </header>

        <section className="mt-5 rounded-lg border border-yellow-300/30 bg-neutral-950 p-5">
          <h2 className="text-xl font-black">Análise de CPF e Documentos</h2>
          <p className="mt-1 text-sm text-neutral-400">Pedidos recentes de troca de CPF. Quando a leitura automática não confirmar o número, use documento e selfie para decidir manualmente.</p>
          <form className="mt-4 flex flex-wrap gap-2">
            <select name="cpfStatus" defaultValue={cpfStatus} className="input max-w-60">
              <option value="PENDING_REVIEW">Pendentes</option>
              <option value="APPROVED">Aprovados</option>
              <option value="REJECTED">Reprovados</option>
              <option value="ALL">Todos</option>
            </select>
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <button className="rounded-full px-5 btn-gold">Filtrar</button>
          </form>

          <div className="mt-4 grid gap-4">
            {cpfRequests.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-yellow-300">{statusLabel(item.status)} · {formatDate(item.createdAt)}</p>
                    <h3 className="mt-1 text-lg font-black">{item.user?.name ?? "Usuário"}</h3>
                    <p className="mt-1 text-neutral-300">{item.user?.email ?? ""} · {formatPhone(item.user?.phone ?? item.user?.whatsapp) || "Sem telefone"}</p>
                    <p className="mt-1 text-xs text-neutral-400">CPF atual: {maskCpf(item.currentCpf)} · Novo CPF: {maskCpf(item.requestedCpf)}</p>
                    <p className={`mt-2 text-xs font-black ${item.ocrCpfMatched === true ? "text-emerald-300" : item.ocrCpfMatched === false ? "text-red-300" : "text-yellow-300"}`}>
                      {item.ocrCpfMatched === true ? "Leitura automática encontrou o CPF informado." : item.ocrCpfMatched === false ? "Atenção: a leitura automática encontrou um CPF diferente." : "A leitura automática não conseguiu confirmar o CPF. Analise manualmente."}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{item.documentOcrProvider ?? "OCR"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.documentSignedUrl ? <a href={item.documentSignedUrl} target="_blank" className="rounded-full border border-yellow-300/30 px-3 py-1 text-xs font-black text-yellow-200">Ver documento</a> : null}
                  {item.selfieSignedUrl ? <a href={item.selfieSignedUrl} target="_blank" className="rounded-full border border-yellow-300/30 px-3 py-1 text-xs font-black text-yellow-200">Ver selfie</a> : null}
                </div>
                {item.status === "PENDING_REVIEW" ? (
                  <div className="mt-4 grid gap-2 lg:grid-cols-2">
                    <CpfReviewForm action="approve_cpf_change" requestId={item.id} label="Aprovar CPF" positive />
                    <CpfReviewForm action="reject_cpf_change" requestId={item.id} label="Reprovar CPF" requiredNote />
                  </div>
                ) : null}
                {admin.adminAccessLevel === "SUPER_ADMIN" && item.user?.id ? <UserRiskActions targetUserId={item.user.id} /> : null}
              </article>
            ))}
            {!cpfRequests.length ? (
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                <strong className="block text-base text-white">Nada para analisar nessa fila.</strong>
                <p className="mt-1">Quando alguém enviar documento e selfie, os pedidos aparecerão aqui para sua decisão.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <h2 className="text-xl font-black">Avaliação de Usuários</h2>
          <p className="mt-1 text-sm text-neutral-400">Busque por nome, username, e-mail ou telefone. Sem busca, exibimos usuários recentes e verificados para revisão rápida.</p>
          <form className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
            {cpfStatus ? <input type="hidden" name="cpfStatus" value={cpfStatus} /> : null}
            <input name="q" defaultValue={q} placeholder="Nome, e-mail, username ou telefone" className="input" />
            <button className="rounded-full px-5 btn-gold">Buscar usuário</button>
          </form>

          <div className="mt-4 grid gap-3">
            {users.map((user) => (
              <article key={user.id} className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black">{user.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${user.accountBlockedAt ? "bg-red-500/15 text-red-200" : "bg-emerald-400/15 text-emerald-200"}`}>
                        {user.accountBlockedAt ? "Bloqueado" : "Liberado"}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${user.identityVerifiedAt ? "bg-emerald-400/15 text-emerald-200" : "bg-yellow-400/15 text-yellow-200"}`}>
                        {user.identityVerifiedAt ? "Documento aprovado" : "Sem documento aprovado"}
                      </span>
                    </div>
                    <p className="mt-1 text-neutral-300">{user.email} · {formatPhone(user.phone ?? user.whatsapp) || "Sem telefone"}</p>
                    <p className="mt-1 text-xs text-neutral-500">Username: {user.username ?? "Não informado"} · CPF: {maskCpf(user.cpf)}</p>
                  </div>
                  <Link href={`/admin?userSearchBy=email&userSearch=${encodeURIComponent(user.email)}#usuarios`} className="rounded-full border border-yellow-300/40 px-4 py-2 text-xs font-black text-yellow-200">
                    Abrir gestão
                  </Link>
                </div>
                {admin.adminAccessLevel === "SUPER_ADMIN" ? <UserRiskActions targetUserId={user.id} /> : null}
              </article>
            ))}
            {!users.length ? <p className="text-sm text-neutral-400">Nenhum usuário encontrado.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function CpfReviewForm({ action, requestId, label, positive = false, requiredNote = false }: { action: string; requestId: string; label: string; positive?: boolean; requiredNote?: boolean }) {
  return (
    <form action="/api/admin/actions" method="POST" className={`grid gap-2 rounded-lg border p-3 ${positive ? "border-emerald-400/20 bg-emerald-400/5" : "border-red-400/20 bg-red-400/5"}`}>
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="returnTo" value="/admin/moderacao" />
      <textarea name="note" required={requiredNote} placeholder={requiredNote ? "Motivo da reprovação" : "Observação opcional"} className="input min-h-20" />
      <button className={`rounded-full px-4 py-2 text-sm font-black ${positive ? "bg-[#22C55E] text-black" : "border border-red-400/40 text-red-200"}`}>
        {label}
      </button>
    </form>
  );
}

function UserRiskActions({ targetUserId }: { targetUserId: string }) {
  return (
    <div className="mt-4 rounded-lg border border-red-400/25 bg-red-950/10 p-3">
      <p className="text-xs font-black uppercase text-red-200">Ações rápidas contra risco</p>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <form action="/api/admin/actions" method="POST" className="grid gap-2 rounded-md border border-red-400/25 bg-black/35 p-3">
          <input type="hidden" name="action" value="user_block" />
          <input type="hidden" name="targetUserId" value={targetUserId} />
          <input type="hidden" name="returnTo" value="/admin/moderacao" />
          <input name="note" placeholder="Motivo do bloqueio" className="input" />
          <button className="rounded-full border border-red-300/40 px-4 py-2 text-sm font-black text-red-100 hover:bg-red-500 hover:text-white">
            Bloquear usuário
          </button>
        </form>
        <form action="/api/admin/actions" method="POST" className="grid gap-2 rounded-md border border-red-500/40 bg-red-950/20 p-3">
          <input type="hidden" name="action" value="user_delete" />
          <input type="hidden" name="targetUserId" value={targetUserId} />
          <input type="hidden" name="returnTo" value="/admin/moderacao" />
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
    </div>
  );
}

async function findCpfRequests(status: string) {
  let query = db()
    .from("CpfChangeRequest")
    .select("id,userId,currentCpf,requestedCpf,status,documentUrl,selfieUrl,documentOcrText,documentOcrProvider,ocrCpfMatched,reviewNote,reviewedAt,createdAt,updatedAt")
    .order("createdAt", { ascending: false })
    .limit(50);
  if (status !== "ALL") query = query.eq("status", status);
  const { data, error } = await query;
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

async function findUsers(q: string) {
  const term = like(q);
  const { data, error } = await db()
    .from("User")
    .select("id,name,username,email,cpf,phone,whatsapp,role,accountBlockedAt,serviceBlockedAt,createdAt,identityVerifiedAt")
    .or(`name.ilike.${term},username.ilike.${term},email.ilike.${term},phone.ilike.${term},whatsapp.ilike.${term}`)
    .order("createdAt", { ascending: false })
    .limit(25);
  throwDbError(error);
  return (data ?? []) as Array<any>;
}

async function findUsersForReview() {
  const { data, error } = await db()
    .from("User")
    .select("id,name,username,email,cpf,phone,whatsapp,role,accountBlockedAt,serviceBlockedAt,createdAt,identityVerifiedAt")
    .order("createdAt", { ascending: false })
    .limit(20);
  throwDbError(error);
  return (data ?? []) as Array<any>;
}

async function findUsersByIds(ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data, error } = await db()
    .from("User")
    .select("id,name,username,email,cpf,phone,whatsapp,accountBlockedAt,serviceBlockedAt,identityVerifiedAt")
    .in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as Array<any>).map((user) => [user.id, user]));
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

function like(term: string) {
  return `%${term.replace(/[%_,]/g, "").trim()}%`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_REVIEW: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Reprovado"
  };
  return labels[status] ?? status;
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}

function maskCpf(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return "Não informado";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}
