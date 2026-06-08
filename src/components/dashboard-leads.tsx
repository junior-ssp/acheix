"use client";

import { useMemo, useState } from "react";
import { Inbox, Send } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

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
  listing?: { title: string; slug: string; category: string };
  service?: { title: string; category: string };
};

type SentLead = {
  id: string;
  kind?: "LISTING" | "SERVICE";
  status: string;
  readAt: string | null;
  createdAt: string;
  listing?: { title: string; slug: string; category: string };
  service?: { title: string; category: string };
};

export function DashboardLeads({ received, sent, ownerName }: { received: ReceivedLead[]; sent: SentLead[]; ownerName: string }) {
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

  async function decide(id: string, status: "WILL_CONTACT" | "IGNORED") {
    const item = receivedItems.find((lead) => lead.id === id);
    const endpoint = endpointFor(item);
    if (!endpoint) return;
    const payload = item?.kind === "SERVICE" ? { status: "CONTACTED" } : { status };
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setReceivedItems((items) => items.map((lead) => lead.id === id ? { ...lead, status: item?.kind === "SERVICE" ? "CONTACTED" : status } : lead));
      setMessage(item?.kind === "SERVICE" ? "Mensagem marcada para resposta no Chat." : "");
    }
  }

  async function contactOnWhatsapp(lead: ReceivedLead) {
    if (lead.kind === "SERVICE") {
      await decide(lead.id, "WILL_CONTACT");
      return;
    }

    await decide(lead.id, "WILL_CONTACT");
    const phone = lead.phone.replace(/\D/g, "");
    if (!phone) {
      setMessage("Este interessado não informou telefone/WhatsApp.");
      return;
    }
    const listingKind = lead.listing?.category === "REAL_ESTATE" ? "IMÓVEL" : "VEÍCULO";
    const listingUrl = `${window.location.origin}/anuncios/${lead.listing?.slug}`;
    const text = [
      "Como vai, tudo bem?",
      "",
      `Sou ${ownerName}. Vi que você se interessou pelo anúncio do meu ${listingKind}.`,
      "",
      listingUrl,
      "",
      "Podemos conversar?"
    ].join("\n");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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
    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-neutral-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-xl font-black"><Inbox size={22} className="text-yellow-300" /> Mensagens Recebidas</h2>
          <div className="flex flex-wrap gap-2">
            {selectionMode ? (
              <>
                <button type="button" onClick={toggleAll} className="rounded-md border border-white/10 px-3 py-2 text-sm font-black text-white hover:border-yellow-300/50">
                  {allSelected ? "Limpar seleção" : "Selecionar todas"}
                </button>
                <button type="button" onClick={removeSelected} disabled={bulkBusy || selectedIds.length === 0} className="rounded-md px-3 py-2 text-sm btn-gold disabled:opacity-60">
                  {bulkBusy ? "Excluindo..." : `Excluir selecionadas${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
                </button>
              </>
            ) : null}
            <button type="button" onClick={startSelection} className="rounded-md px-3 py-2 text-sm btn-gold">
              {selectionMode ? "Cancelar" : "Excluir mensagens"}
            </button>
          </div>
        </div>
        {message && <p className="mt-2 text-sm text-yellow-300">{message}</p>}
        <div className="mt-4 grid gap-3">
          {receivedItems.map((lead) => {
            const isService = lead.kind === "SERVICE";
            const title = isService ? lead.service?.title : lead.listing?.title;
            const href = isService ? "/servicos" : `/anuncios/${lead.listing?.slug}`;
            const selected = selectedIds.includes(lead.id);
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
                      aria-label={`Selecionar mensagem de ${title}`}
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
                      Interessado: {lead.name ?? "Usuário"} · {lead.email} · {isService ? "contato protegido no Chat" : formatPhone(lead.phone) || "telefone não informado"}
                    </p>
                    {!selectionMode ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => contactOnWhatsapp(lead)} className="rounded-md px-3 py-2 btn-gold">
                          {isService ? "Responder no Chat" : "Responder agora"}
                        </button>
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
          {!receivedItems.length && <p className="text-sm text-neutral-400">Nenhuma mensagem recebida.</p>}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-neutral-900 p-4">
        <h2 className="inline-flex items-center gap-2 text-xl font-black"><Send size={22} className="text-yellow-300" /> Mensagens Enviadas</h2>
        <div className="mt-4 grid gap-3">
          {sent.map((lead) => {
            const isService = lead.kind === "SERVICE";
            return (
              <article key={`${lead.kind ?? "LISTING"}-${lead.id}`} className={`rounded-md border p-3 text-sm ${cardClassName(isService, false, false)}`}>
                <strong className="block">{isService ? lead.service?.title : lead.listing?.title}</strong>
                <p className={`mt-1 text-xs font-black uppercase ${isService ? "text-emerald-200" : "text-yellow-300"}`}>{isService ? "Serviço" : "Anúncio"}</p>
                <p className="mt-1 text-neutral-300">Enviada em {new Date(lead.createdAt).toLocaleDateString("pt-BR")}</p>
                <p className="text-yellow-300">Status: {lead.status === "UNREAD" ? "Não lida" : lead.status}</p>
              </article>
            );
          })}
          {!sent.length && <p className="text-sm text-neutral-400">Nenhuma mensagem enviada.</p>}
        </div>
      </div>
    </section>
  );
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
