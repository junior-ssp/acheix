import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBackofficePageUser } from "@/lib/admin-auth";
import { db, throwDbError } from "@/lib/supabase-db";
import { formatCep, formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function AdminServiceProviderPage({ params }: { params: { id: string } }) {
  await requireBackofficePageUser();

  const [service, reports] = await Promise.all([findServiceProfile(params.id), findServiceReports(params.id)]);

  if (!service) notFound();

  const title = service.companyTradeName ?? service.companyLegalName ?? service.name ?? service.user.name;
  const categories = service.categories.length ? service.categories : [service.category];

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin#servicos" className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-black text-white hover:bg-yellow-300 hover:text-black">
          Voltar para Prestadores
        </Link>

        <section className="mt-4 rounded-lg border border-white/10 bg-neutral-950 p-5">
          <p className="text-xs font-black uppercase text-yellow-300">Prestador de Serviços</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">{title}</h1>
              <p className="mt-1 text-sm text-neutral-400">{service.city}/{service.state}{service.district ? ` - ${service.district}` : ""}</p>
            </div>
            <span className="rounded-full border border-yellow-300/30 px-4 py-2 text-sm font-black text-yellow-200">{service.status}</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Tipo" value={service.type} />
            <Info label="Categoria" value={service.category} />
            <Info label="Nota" value={`${service.averageRating}/5`} />
            <Info label="Score" value={String(service.score)} />
            <Info label="Contatos" value={String(service._count.contacts)} />
            <Info label="Avaliações" value={String(service._count.reviews)} />
            <Info label="Rank" value={service.rank} />
            <Info label="Ativo" value={service.active ? "Sim" : "Não"} />
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Dados do Prestador">
            <InfoList items={[
              ["Nome", service.name],
              ["Razão Social", service.companyLegalName],
              ["Nome Fantasia", service.companyTradeName],
              ["Documento", service.document],
              ["Telefone Privado", formatPhone(service.privatePhone)],
              ["WhatsApp Privado", formatPhone(service.privateWhatsapp)],
              ["E-mail Privado", service.privateEmail],
              ["Site", service.website],
              ["Serviços", categories.join(", ")],
              ["Descrição", service.description],
              ["Experiência", service.experience],
              ["Horário", service.businessHours]
            ]} />
          </Panel>

          <Panel title="Localização do Serviço">
            <InfoList items={[
              ["Estado", service.state],
              ["Cidade", service.city],
              ["Bairro", service.district],
              ["CEP", formatCep(service.cep)],
              ["Endereço", service.address],
              ["Número", service.number],
              ["Complemento", service.complement],
              ["Latitude", service.latitude?.toString()],
              ["Longitude", service.longitude?.toString()]
            ]} />
          </Panel>

          <Panel title="Usuário Vinculado">
            <InfoList items={[
              ["Nome", service.user.name],
              ["Username", service.user.username],
              ["E-mail", service.user.email],
              ["CPF", service.user.cpf],
              ["CNPJ", service.user.cnpj],
              ["Telefone", formatPhone(service.user.phone)],
              ["WhatsApp", formatPhone(service.user.whatsapp)],
              ["Perfil", service.user.role],
              ["Conta", service.user.accountBlockedAt ? `Bloqueada - ${service.user.accountBlockedReason ?? "sem motivo"}` : "Liberada"],
              ["Serviços", service.user.serviceBlockedAt ? `Bloqueado - ${service.user.serviceBlockedReason ?? "sem motivo"}` : "Liberado"],
              ["Documento Verificado", service.user.identityVerifiedAt ? "Sim" : "Não"],
              ["Telefone Verificado", service.user.phoneVerifiedAt ? "Sim" : "Não"],
              ["WhatsApp Verificado", service.user.whatsappVerifiedAt ? "Sim" : "Não"],
              ["Criado em", formatDate(service.user.createdAt)]
            ]} />
          </Panel>

          <Panel title="Endereço do Usuário">
            <InfoList items={[
              ["CEP", formatCep(service.user.cep)],
              ["Endereço", service.user.address],
              ["Número", service.user.number],
              ["Complemento", service.user.complement],
              ["Bairro", service.user.district],
              ["Cidade", service.user.city],
              ["Estado", service.user.state]
            ]} />
          </Panel>
        </div>

        <Panel title="Contatos Recentes" className="mt-4">
          <div className="grid gap-2">
            {service.contacts.map((contact) => (
              <div key={contact.id} className="rounded-md border border-white/10 bg-black/30 p-3 text-sm">
                <p className="font-black">{contact.name ?? "Interessado"} · {contact.email}</p>
                <p className="text-neutral-300">{formatPhone(contact.phone) || "Telefone não informado"} · {contact.status} · {formatDate(contact.createdAt)}</p>
                {contact.message ? <p className="mt-1 text-neutral-400">{contact.message}</p> : null}
              </div>
            ))}
            {!service.contacts.length ? <p className="text-sm text-neutral-400">Nenhum contato recente.</p> : null}
          </div>
        </Panel>

        <Panel title="Avaliações e Denúncias" className="mt-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid gap-2">
              <h2 className="font-black text-yellow-200">Avaliações</h2>
              {service.reviews.map((review) => (
                <div key={review.id} className="rounded-md border border-white/10 bg-black/30 p-3 text-sm">
                  <p className="font-black">{review.outcome} · {formatDate(review.createdAt)}</p>
                  <p className="text-neutral-300">{review.reviewer?.name ?? "Usuário"} · {review.reviewer?.email ?? "sem e-mail"}</p>
                  {review.comment ? <p className="mt-1 text-neutral-400">{review.comment}</p> : null}
                </div>
              ))}
              {!service.reviews.length ? <p className="text-sm text-neutral-400">Nenhuma avaliação recente.</p> : null}
            </div>
            <div className="grid gap-2">
              <h2 className="font-black text-red-200">Denúncias</h2>
              {reports.map((report) => (
                <div key={report.id} className="rounded-md border border-red-500/30 bg-red-950/20 p-3 text-sm">
                  <p className="font-black">{report.reason} · {formatDate(report.createdAt)}</p>
                  <p className="text-neutral-300">{report.reporter.name} · {report.reporter.email}</p>
                  <p className="mt-1 text-neutral-400">{report.description}</p>
                </div>
              ))}
              {!reports.length ? <p className="text-sm text-neutral-400">Nenhuma denúncia recente.</p> : null}
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}

async function findServiceProfile(id: string) {
  const { data, error } = await db()
    .from("service_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwDbError(error);
  if (!data) return null;
  const row = data as any;
  const [user, contacts, reviews, counts] = await Promise.all([
    findUser(row.user_id),
    findContacts(id),
    findReviews(id),
    findProfileCounts(id)
  ]);
  return {
    id: row.id,
    type: row.tipo_cadastro,
    category: row.categoria_servico,
    categories: row.categorias_servico ?? [],
    name: row.name,
    companyLegalName: row.razao_social,
    companyTradeName: row.nome_fantasia,
    document: row.document,
    description: row.descricao,
    experience: row.experiencia,
    businessHours: row.horario_atendimento,
    city: row.cidade,
    district: row.bairro,
    cep: row.cep,
    state: row.estado,
    address: row.endereco,
    number: row.numero,
    complement: row.complemento,
    latitude: row.latitude,
    longitude: row.longitude,
    privatePhone: row.telefone_privado,
    privateWhatsapp: row.whatsapp_privado,
    privateEmail: row.email_privado,
    website: row.website,
    averageRating: row.avaliacao_media,
    totalRatings: row.total_avaliacoes,
    rank: row.rank,
    score: row.score,
    active: row.active,
    status: row.status,
    user: user ?? { name: "Usuário", email: "" },
    contacts,
    reviews,
    _count: counts
  };
}

async function findUser(id: string) {
  const { data, error } = await db()
    .from("User")
    .select("id,name,username,email,cpf,cnpj,phone,whatsapp,cep,address,number,complement,district,city,state,role,accountBlockedAt,accountBlockedReason,serviceBlockedAt,serviceBlockedReason,identityVerifiedAt,phoneVerifiedAt,whatsappVerifiedAt,cpfVerifiedAt,createdAt")
    .eq("id", id)
    .maybeSingle();
  throwDbError(error);
  return data as any;
}

async function findContacts(profileId: string) {
  const { data, error } = await db()
    .from("ServiceContact")
    .select("id,name,email,phone,message,status,createdAt")
    .eq("profileId", profileId)
    .order("createdAt", { ascending: false })
    .limit(8);
  throwDbError(error);
  return (data ?? []) as Array<any>;
}

async function findReviews(profileId: string) {
  const { data, error } = await db()
    .from("ServiceReview")
    .select("id,reviewerId,outcome,comment,createdAt")
    .eq("profileId", profileId)
    .order("createdAt", { ascending: false })
    .limit(8);
  throwDbError(error);
  const reviews = (data ?? []) as Array<any>;
  const reviewers = await findUsersByIds([...new Set(reviews.map((review) => review.reviewerId).filter(Boolean))]);
  return reviews.map((review) => ({ ...review, reviewer: review.reviewerId ? reviewers.get(review.reviewerId) ?? null : null }));
}

async function findServiceReports(serviceId: string) {
  const { data, error } = await db()
    .from("TrustReport")
    .select("id,reporterId,reason,description,createdAt")
    .eq("serviceId", serviceId)
    .order("createdAt", { ascending: false })
    .limit(8);
  throwDbError(error);
  const reports = (data ?? []) as Array<any>;
  const reporters = await findUsersByIds([...new Set(reports.map((report) => report.reporterId).filter(Boolean))]);
  return reports.map((report) => ({ ...report, reporter: reporters.get(report.reporterId) ?? { name: "Usuário", email: "" } }));
}

async function findUsersByIds(ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data, error } = await db().from("User").select("id,name,email").in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as Array<any>).map((user) => [user.id, user]));
}

async function findProfileCounts(profileId: string) {
  const [contacts, reviews] = await Promise.all([
    countRows("ServiceContact", "profileId", profileId),
    countRows("ServiceReview", "profileId", profileId)
  ]);
  return { contacts, reviews };
}

async function countRows(table: string, column: string, value: string) {
  const { count, error } = await db().from(table).select("id", { count: "exact", head: true }).eq(column, value);
  throwDbError(error);
  return count ?? 0;
}
function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-white/10 bg-neutral-950 p-4 ${className}`}>
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[11px] font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-white">{value}</p>
    </div>
  );
}

function InfoList({ items }: { items: Array<[string, string | null | undefined]> }) {
  return (
    <dl className="grid gap-2 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-white/10 bg-black/25 p-2">
          <dt className="text-[11px] font-black uppercase text-neutral-500">{label}</dt>
          <dd className="mt-1 break-words text-neutral-100">{value || "Não informado"}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

