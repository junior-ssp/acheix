"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, MessageCircle, Search, Send } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

type ListingMini = { title: string; slug: string; category: string; type?: string; photoUrl?: string | null };

type ReceivedLead = {
  id: string;
  kind?: "LISTING" | "SERVICE";
  interestedUserId?: string | null;
  name: string | null;
  email: string;
  phone: string;
  question1: string;
  question2: string | null;
  question3: string | null;
  status: string;
  createdAt: string;
  listing?: ListingMini;
  service?: { title: string; category: string };
};

type SentLead = {
  id: string;
  kind?: "LISTING" | "SERVICE";
  status: string;
  readAt: string | null;
  createdAt: string;
  listing?: ListingMini;
  service?: { title: string; category: string };
};

type QuickOutcome = { status: "SOLD" | "RENTED"; label: string };
type ChatFilter = "ALL" | "RECEIVED" | "SENT";
type MessageUnreadCounts = { vehicles: number; realEstate: number; services: number; total: number };
type ApiConversation = {
  id: string;
  category: "VEHICLES" | "REAL_ESTATE" | "SERVICES";
  direction: "RECEIVED" | "SENT";
  unreadCount: number;
  lastMessage: { body: string; createdAt: string; mine: boolean };
  contact: { name: string; email: string | null; phone: string | null };
  target: { kind: "LISTING" | "SERVICE"; title: string; city?: string | null; state?: string | null; imageUrl?: string | null; href: string };
};

export function DashboardLeads({ received, sent }: { received: ReceivedLead[]; sent: SentLead[]; ownerName: string }) {
  const [receivedItems, setReceivedItems] = useState(received);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [message, setMessage] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [filter, setFilter] = useState<ChatFilter>("ALL");
  const [unreadCounts, setUnreadCounts] = useState<MessageUnreadCounts>({ vehicles: 0, realEstate: 0, services: 0, total: 0 });
  const [apiConversations, setApiConversations] = useState<ApiConversation[]>([]);
  const highlightedLeadId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("lead") ?? new URLSearchParams(window.location.search).get("serviceContact")
    : null;

  const allReceivedIds = useMemo(() => receivedItems.map((lead) => lead.id), [receivedItems]);
  const allSelected = allReceivedIds.length > 0 && selectedIds.length === allReceivedIds.length;
  const leadConversations = useMemo(() => {
    const receivedRows = receivedItems.map((lead) => ({ id: lead.id, direction: "RECEIVED" as const, createdAt: lead.createdAt, lead }));
    const sentRows = sent.map((lead) => ({ id: lead.id, direction: "SENT" as const, createdAt: lead.createdAt, lead }));
    return [...receivedRows, ...sentRows]
      .filter((row) => filter === "ALL" || row.direction === filter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filter, receivedItems, sent]);

  useEffect(() => {
    Promise.all([
      fetch("/api/messages/unread-counts", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
      fetch("/api/messages/conversations", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null)
    ])
      .then(([countData, conversationData]) => {
        const counts = countData?.counts;
        if (counts) {
          setUnreadCounts({
            vehicles: Number(counts.vehicles ?? 0),
            realEstate: Number(counts.realEstate ?? 0),
            services: Number(counts.services ?? 0),
            total: Number(counts.total ?? 0)
          });
        }
        if (Array.isArray(conversationData?.conversations)) setApiConversations(conversationData.conversations);
      })
      .catch(() => undefined);
  }, [receivedItems.length]);

  const conversations = useMemo(() => {
    if (apiConversations.length) {
      return apiConversations
        .filter((row) => filter === "ALL" || row.direction === filter)
        .map((row) => ({ kind: "MESSAGE" as const, ...row, createdAt: row.lastMessage.createdAt }));
    }
    return leadConversations.map((row) => ({ kind: "LEAD" as const, ...row }));
  }, [apiConversations, filter, leadConversations]);

  async function decide(id: string, status: "SOLD" | "RENTED") {
    const item = receivedItems.find((lead) => lead.id === id);
    const endpoint = endpointFor(item);
    if (!endpoint || item?.kind === "SERVICE") return;
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (response.ok) {
      setReceivedItems((items) => items.map((lead) => lead.id === id ? { ...lead, status } : lead));
      setMessage(status === "SOLD" ? "Interessado avisado que o item já foi vendido." : "Interessado avisado que o imóvel já foi alugado.");
    } else {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? "Não foi possível avisar o interessado agora.");
    }
  }

  async function remove(id: string) {
    const item = receivedItems.find((lead) => lead.id === id);
    const endpoint = endpointFor(item);
    if (!endpoint) return;
    const response = await fetch(endpoint, { method: "DELETE" });
    if (response.ok) {
      setReceivedItems((items) => items.filter((lead) => lead.id !== id));
      setSelectedIds((ids) => ids.filter((selectedId) => selectedId !== id));
    }
  }

  async function blockUser(lead: ReceivedLead) {
    if (!lead.interestedUserId) {
      setMessage("Não foi possível identificar o usuário para bloqueio.");
      return;
    }
    const response = await fetch(`/api/users/${lead.interestedUserId}/block`, { method: "POST" });
    if (response.ok) {
      setMessage("Usuário bloqueado. Ele não poderá enviar novas mensagens para você.");
      return;
    }
    const data = await response.json().catch(() => null);
    setMessage(data?.error ?? "Não foi possível bloquear este usuário agora.");
  }

  async function removeSelected() {
    if (!selectedIds.length) {
      setMessage("Selecione pelo menos uma mensagem para excluir.");
      return;
    }
    setBulkBusy(true);
    setMessage("");
    const targets = selectedIds
      .map((id) => receivedItems.find((lead) => lead.id === id))
      .filter(Boolean) as ReceivedLead[];

    const results = await Promise.all(
      targets.map(async (item) => {
        const endpoint = endpointFor(item);
        if (!endpoint) return false;
        const response = await fetch(endpoint, { method: "DELETE" });
        return response.ok;
      })
    );

    const removedIds = targets.filter((_, index) => results[index]).map((item) => item.id);
    setReceivedItems((items) => items.filter((lead) => !removedIds.includes(lead.id)));
    setSelectedIds([]);
    setSelectionMode(false);
    setBulkBusy(false);
    setMessage(removedIds.length ? `${removedIds.length} mensagem(ns) excluída(s).` : "Não foi possível excluir as mensagens selecionadas.");
  }

  function toggleSelected(id: string) {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : allReceivedIds);
  }

  function startSelection() {
    setMessage("");
    setSelectionMode((current) => {
      if (current) setSelectedIds([]);
      return !current;
    });
  }

  return (
    <section id="mensagens" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <span id="interesses" className="sr-only" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Chat</h2>
          <p className="mt-1 text-sm text-neutral-400">{receivedItems.length + sent.length} conversa{receivedItems.length + sent.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectionMode ? (
            <>
              <button type="button" onClick={toggleAll} className="rounded-md border border-white/10 px-3 py-2 text-sm font-black text-white hover:border-yellow-300/50">
                {allSelected ? "Limpar seleção" : "Selecionar todos"}
              </button>
              <button type="button" onClick={removeSelected} disabled={bulkBusy || selectedIds.length === 0} className="rounded-md px-3 py-2 text-sm btn-gold disabled:opacity-60">
                {bulkBusy ? "Excluindo..." : `Excluir selecionados${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
              </button>
            </>
          ) : null}
          <button type="button" onClick={startSelection} className="rounded-md px-3 py-2 text-sm btn-gold">
            {selectionMode ? "Cancelar" : "Excluir mensagens"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <ChatFilterButton active={filter === "ALL"} onClick={() => setFilter("ALL")} label="Todas" count={apiConversations.length || receivedItems.length + sent.length} />
        <ChatFilterButton active={filter === "RECEIVED"} onClick={() => setFilter("RECEIVED")} label="Recebidas" count={apiConversations.length ? apiConversations.filter((item) => item.direction === "RECEIVED").length : receivedItems.length} />
        <ChatFilterButton active={filter === "SENT"} onClick={() => setFilter("SENT")} label="Enviadas" count={apiConversations.length ? apiConversations.filter((item) => item.direction === "SENT").length : sent.length} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <UnreadPill label="Veículos" value={unreadCounts.vehicles} />
        <UnreadPill label="Imóveis" value={unreadCounts.realEstate} />
        <UnreadPill label="Serviços" value={unreadCounts.services} />
        <UnreadPill label="Total" value={unreadCounts.total} strong />
      </div>

      {message && <p className="mt-3 text-sm text-yellow-300">{message}</p>}
      <p className="mt-3 rounded-md border border-yellow-300/20 bg-yellow-300/10 p-3 text-xs font-bold text-yellow-100">
        O Achei X nunca solicita dados pessoais, senhas ou pagamentos por este canal. Desconfie de links externos e denuncie comportamentos suspeitos.
      </p>

      <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-black/20">
        {conversations.map((row) => {
          if (row.kind === "MESSAGE") {
            return <MessageConversationRow key={row.id} conversation={row} />;
          }

          if (row.direction === "RECEIVED") {
            const lead = row.lead;
            const isService = lead.kind === "SERVICE";
            const title = isService ? lead.service?.title : lead.listing?.title;
            const href = isService ? "/servicos" : `/anuncios/${lead.listing?.slug}`;
            const selected = selectedIds.includes(lead.id);
            const outcome = quickOutcome(lead);
            return (
              <article
                key={`received-${lead.kind ?? "LISTING"}-${lead.id}`}
                id={`lead-${lead.id}`}
                className={`p-3 transition ${highlightedLeadId === lead.id ? "bg-yellow-300/10" : "hover:bg-white/[0.03]"}`}
              >
                <div className="flex gap-3">
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelected(lead.id)}
                      aria-label={`Selecionar mensagem de ${title}`}
                      className="mt-5 h-5 w-5 shrink-0 accent-yellow-300"
                    />
                  ) : null}
                  <ConversationImage title={title} imageUrl={isService ? null : lead.listing?.photoUrl} isService={isService} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a href={href} className="block truncate text-xs font-black uppercase text-neutral-400 hover:text-yellow-200">{title}</a>
                        <p className="mt-1 truncate text-base font-black text-white">{lead.name ?? "Usuário"}</p>
                      </div>
                      <time className="shrink-0 text-xs font-bold text-neutral-400">{relativeDate(lead.createdAt)}</time>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-neutral-200">{lead.question1}</p>
                    <p className="mt-1 truncate text-xs text-neutral-400">{lead.email} · {formatPhone(lead.phone) || "telefone não informado"}</p>
                    {lead.question2 || lead.question3 ? (
                      <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{[lead.question2, lead.question3].filter(Boolean).join(" · ")}</p>
                    ) : null}
                    {!selectionMode ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {outcome ? (
                          <button type="button" onClick={() => decide(lead.id, outcome.status)} className="rounded-md px-3 py-2 text-xs btn-gold">
                            {outcome.label}
                          </button>
                        ) : null}
                        {!isService && lead.interestedUserId ? (
                          <button type="button" onClick={() => blockUser(lead)} className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200">
                            Bloquear usuário
                          </button>
                        ) : null}
                        <button type="button" onClick={() => remove(lead.id)} className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200">Excluir</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          }

          const lead = row.lead;
          const isService = lead.kind === "SERVICE";
          const title = isService ? lead.service?.title : lead.listing?.title;
          return (
            <article key={`sent-${lead.kind ?? "LISTING"}-${lead.id}`} className="p-3 transition hover:bg-white/[0.03]">
              <div className="flex gap-3">
                <ConversationImage title={title} imageUrl={isService ? null : lead.listing?.photoUrl} isService={isService} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase text-neutral-400">{title}</p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-base font-black text-white">
                        <Send size={15} className="shrink-0 text-yellow-300" />
                        Mensagem enviada
                      </p>
                    </div>
                    <time className="shrink-0 text-xs font-bold text-neutral-400">{relativeDate(lead.createdAt)}</time>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-neutral-200">Status: {statusLabel(lead.status)}</p>
                </div>
              </div>
            </article>
          );
        })}
        {!conversations.length ? (
          <div className="grid min-h-44 place-items-center p-6 text-center text-sm text-neutral-400">
            <div>
              <Search className="mx-auto mb-2 text-neutral-500" size={28} />
              Nenhuma conversa neste filtro.
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ChatFilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-black transition ${active ? "border-white bg-white text-black" : "border-white/15 text-white hover:border-yellow-300/50"}`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-black/10" : "bg-white/10"}`}>{count}</span>
    </button>
  );
}

function UnreadPill({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${strong ? "border-yellow-300/35 bg-yellow-300/10 text-yellow-100" : "border-white/10 bg-black/25 text-neutral-200"}`}>
      <span className="block font-black uppercase text-neutral-400">{label}</span>
      <strong className="mt-0.5 block text-lg text-white">{value}</strong>
    </div>
  );
}

function MessageConversationRow({ conversation }: { conversation: ApiConversation & { createdAt: string } }) {
  return (
    <a href={conversation.target.href} className="block p-3 transition hover:bg-white/[0.04]">
      <div className="flex gap-3">
        <ConversationImage title={conversation.target.title} imageUrl={conversation.target.imageUrl} isService={conversation.target.kind === "SERVICE"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase text-neutral-400">{conversation.target.title}</p>
              <p className="mt-1 flex items-center gap-1.5 truncate text-base font-black text-white">
                <MessageCircle size={15} className={conversation.unreadCount > 0 ? "text-yellow-300" : "text-neutral-400"} />
                {conversation.contact.name}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <time className="block text-xs font-bold text-neutral-400">{relativeDate(conversation.lastMessage.createdAt)}</time>
              {conversation.unreadCount > 0 ? (
                <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                </span>
              ) : null}
            </div>
          </div>
          <p className={`mt-1 line-clamp-1 text-sm ${conversation.unreadCount > 0 ? "font-black text-white" : "text-neutral-300"}`}>
            {conversation.lastMessage.mine ? "Você: " : ""}{conversation.lastMessage.body}
          </p>
          <p className="mt-1 truncate text-xs text-neutral-500">
            {[categoryLabel(conversation.category), conversation.target.city && conversation.target.state ? `${conversation.target.city}, ${conversation.target.state}` : null, conversation.contact.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </a>
  );
}

function ConversationImage({ title, imageUrl, isService }: { title?: string | null; imageUrl?: string | null; isService: boolean }) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-md border border-white/10 object-cover" />;
  }
  const initial = String(title ?? "A").trim().charAt(0).toUpperCase() || "A";
  return (
    <span className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-white/10 bg-neutral-800 text-lg font-black text-white">
      {isService ? <BriefcaseBusiness size={24} className="text-emerald-300" /> : initial}
    </span>
  );
}

function categoryLabel(category: ApiConversation["category"]) {
  if (category === "VEHICLES") return "Veículos";
  if (category === "REAL_ESTATE") return "Imóveis";
  return "Serviços";
}

function relativeDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startDate) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function quickOutcome(lead: ReceivedLead): QuickOutcome | null {
  if (lead.kind === "SERVICE" || !lead.listing) return null;
  if (lead.listing.category === "REAL_ESTATE") return { status: "RENTED", label: "Já Aluguei" };
  return { status: "SOLD", label: "Já Vendi" };
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    UNREAD: "Não lido",
    READ: "Lido",
    WILL_CONTACT: "Respondido",
    IGNORED: "Encerrado",
    SOLD: "Já vendido",
    RENTED: "Já alugado"
  };
  return labels[status] ?? status;
}

function endpointFor(item?: ReceivedLead) {
  if (!item) return null;
  return item.kind === "SERVICE" ? `/api/service-contacts/${item.id}` : `/api/contact-leads/${item.id}`;
}
