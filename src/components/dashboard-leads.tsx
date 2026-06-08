"use client";

import { useMemo, useState } from "react";
import { Inbox, Send } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

type ListingMini = { title: string; slug: string; category: string; type?: string };

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

export function DashboardLeads({ received, sent }: { received: ReceivedLead[]; sent: SentLead[]; ownerName: string }) {
  const [receivedItems, setReceivedItems] = useState(received);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [message, setMessage] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const highlightedLeadId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("lead") ?? new URLSearchParams(window.location.search).get("serviceContact")
    : null;

  const allReceivedIds = useMemo(() => receivedItems.map((lead) => lead.id), [receivedItems]);
  const allSelected = allReceivedIds.length > 0 && selectedIds.length === allReceivedIds.length;

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
      setMessage("Usuário bloqueado. Ele não poderá enviar novos interesses para você.");
      return;
    }
    const data = await response.json().catch(() => null);
    setMessage(data?.error ?? "Não foi possível bloquear este usuário agora.");
  }

  async function removeSelected() {
    if (!selectedIds.length) {
      setMessage("Selecione pelo menos um interesse para excluir.");
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
    setMessage(removedIds.length ? `${removedIds.length} interesse(s) excluído(s).` : "Não foi possível excluir os interesses selecionados.");
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
    <section id="interesses" className="mt-8 grid scroll-mt-24 gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-neutral-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-xl font-black"><Inbox size={22} className="text-yellow-300" /> Interesses Recebidos</h2>
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
              {selectionMode ? "Cancelar" : "Excluir interesses"}
            </button>
          </div>
        </div>
        {message && <p className="mt-2 text-sm text-yellow-300">{message}</p>}
        <p className="mt-3 rounded-md border border-yellow-300/20 bg-yellow-300/10 p-3 text-xs font-bold text-yellow-100">
          O Achei X nunca solicita dados pessoais, senhas ou pagamentos por este canal. Desconfie de links externos e denuncie comportamentos suspeitos.
        </p>
        <div className="mt-4 grid gap-3">
          {receivedItems.map((lead) => {
            const isService = lead.kind === "SERVICE";
            const title = isService ? lead.service?.title : lead.listing?.title;
            const href = isService ? "/servicos" : `/anuncios/${lead.listing?.slug}`;
            const selected = selectedIds.includes(lead.id);
            const outcome = quickOutcome(lead);
            return (
              <article
                key={`${lead.kind ?? "LISTING"}-${lead.id}`}
                id={`lead-${lead.id}`}
                className={`rounded-md border p-3 text-sm transition ${cardClassName(isService, lead.id === highlightedLeadId, selected)}`}
              >
                <div className="flex gap-3">
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelected(lead.id)}
                      aria-label={`Selecionar interesse de ${title}`}
                      className="mt-1 h-5 w-5 shrink-0 accent-yellow-300"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <a href={href} className="block font-black text-white underline decoration-yellow-300/60 underline-offset-4 hover:text-yellow-200">{title}</a>
                    <p className={`mt-1 text-xs font-black uppercase ${isService ? "text-emerald-200" : "text-yellow-300"}`}>{isService ? "Serviço" : "Anúncio"}</p>
                    <p className="mt-1 text-neutral-200">{lead.question1}</p>
                    {lead.question2 && <p className="text-neutral-300">2. {lead.question2}</p>}
                    {lead.question3 && <p className="text-neutral-300">3. {lead.question3}</p>}
                    <p className="mt-2 text-neutral-300">
                      Interessado: {lead.name ?? "Usuário"} · {lead.email} · {formatPhone(lead.phone) || "telefone não informado"}
                    </p>
                    {!selectionMode ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {outcome ? (
                          <button type="button" onClick={() => decide(lead.id, outcome.status)} className="rounded-md px-3 py-2 btn-gold">
                            {outcome.label}
                          </button>
                        ) : null}
                        {!isService && lead.interestedUserId ? (
                          <button type="button" onClick={() => blockUser(lead)} className="rounded-md border border-red-400/30 px-3 py-2 font-bold text-red-200">
                            Bloquear usuário
                          </button>
                        ) : null}
                        <button type="button" onClick={() => remove(lead.id)} className="rounded-md border border-red-400/30 px-3 py-2 font-bold text-red-200">Excluir</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
          {!receivedItems.length && <p className="text-sm text-neutral-400">Nenhum interesse recebido.</p>}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-neutral-900 p-4">
        <h2 className="inline-flex items-center gap-2 text-xl font-black"><Send size={22} className="text-yellow-300" /> Interesses Enviados</h2>
        <div className="mt-4 grid gap-3">
          {sent.map((lead) => {
            const isService = lead.kind === "SERVICE";
            return (
              <article key={`${lead.kind ?? "LISTING"}-${lead.id}`} className={`rounded-md border p-3 text-sm ${cardClassName(isService, false, false)}`}>
                <strong className="block">{isService ? lead.service?.title : lead.listing?.title}</strong>
                <p className={`mt-1 text-xs font-black uppercase ${isService ? "text-emerald-200" : "text-yellow-300"}`}>{isService ? "Serviço" : "Anúncio"}</p>
                <p className="mt-1 text-neutral-300">Enviado em {new Date(lead.createdAt).toLocaleDateString("pt-BR")}</p>
                <p className="text-yellow-300">Status: {statusLabel(lead.status)}</p>
              </article>
            );
          })}
          {!sent.length && <p className="text-sm text-neutral-400">Nenhum interesse enviado.</p>}
        </div>
      </div>
    </section>
  );
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

function cardClassName(isService: boolean, highlighted: boolean, selected: boolean) {
  if (selected) return "border-yellow-300 bg-yellow-300/20 shadow-[0_0_24px_rgba(250,204,21,0.18)]";
  if (highlighted) return "border-yellow-300 bg-yellow-300/10";
  return isService
    ? "border-emerald-300/25 bg-emerald-950/35 shadow-[inset_4px_0_0_rgba(52,211,153,0.55)]"
    : "border-sky-300/20 bg-sky-950/30 shadow-[inset_4px_0_0_rgba(250,204,21,0.65)]";
}
