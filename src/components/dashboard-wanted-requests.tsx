"use client";

import { useMemo, useState } from "react";
import { Clock, Pencil, Save, Search, Trash2, X } from "lucide-react";

export type DashboardWantedRequest = {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  expiresAt: string;
  contactClickCount: number;
  createdAt: string;
};

export function DashboardWantedRequests({ requests }: { requests: DashboardWantedRequest[] }) {
  const [items, setItems] = useState(requests);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const activeCount = useMemo(() => items.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).length, [items]);

  function startEdit(item: DashboardWantedRequest) {
    setEditingId(item.id);
    setDraftTitle(item.title);
    setDraftDescription(item.description);
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftTitle("");
    setDraftDescription("");
  }

  async function save(id: string) {
    if (busyId) return;
    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch(`/api/wanted-requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: draftTitle, description: draftDescription })
      });
      const data = await response.json().catch(() => null);
      if (response.ok) {
        setItems((current) => current.map((item) => item.id === id ? { ...item, title: data.wanted.title, description: data.wanted.description } : item));
        setMessage("Procura-se atualizado.");
        cancelEdit();
        return;
      }
      setMessage(wantedRequestErrorMessage(data, "Não foi possível salvar."));
    } catch {
      setMessage("Não foi possível salvar.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir este Procura-se?")) return;
    const response = await fetch(`/api/wanted-requests/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("Procura-se excluído.");
      if (editingId === id) cancelEdit();
      return;
    }
    setMessage("Não foi possível excluir.");
  }

  return (
    <section id="meus-procura-se" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Procura-se</p>
          <h2 className="mt-1 text-xl font-black">O que eu procuro</h2>
          <p className="mt-1 text-sm text-neutral-400">{activeCount} ativo(s) agora.</p>
        </div>
        <a href="/procuro" className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm btn-gold">Registrar Procura-se</a>
      </div>

      {message ? <p className="mt-3 text-sm font-bold text-yellow-300">{message}</p> : null}

      <div className="mt-4 grid gap-3">
        {items.map((item) => {
          const expiresAt = new Date(item.expiresAt);
          const active = expiresAt.getTime() > Date.now();
          const days = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000));
          const editing = editingId === item.id;

          return (
            <article key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Search size={18} className="shrink-0 text-yellow-300" />
                    {editing ? (
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.currentTarget.value)}
                        minLength={1}
                        className="input h-10"
                      />
                    ) : (
                      <h3 className="line-clamp-2 font-black">{item.title}</h3>
                    )}
                  </div>
                  {editing ? (
                    <textarea
                      value={draftDescription}
                      onChange={(event) => setDraftDescription(event.currentTarget.value)}
                      minLength={1}
                      rows={4}
                      className="input mt-2"
                    />
                  ) : (
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-300">{item.description}</p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-black ${active ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}`}>
                  {active ? "Ativo" : "Expirado"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-neutral-300 sm:grid-cols-3">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={16} className="text-yellow-300" />
                  {active ? `${days} dia(s)` : "Expirado"}
                </span>
                <span>Prazo escolhido: {item.durationDays} dias</span>
                <span>Contatos: {item.contactClickCount}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {editing ? (
                  <>
                    <button type="button" disabled={busyId === item.id} onClick={() => save(item.id)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#22C55E] px-4 text-sm font-black text-black transition hover:bg-[#34D399] disabled:cursor-not-allowed disabled:opacity-60">
                      <Save size={17} />
                      {busyId === item.id ? "Salvando..." : "Salvar"}
                    </button>
                    <button type="button" disabled={busyId === item.id} onClick={cancelEdit} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                      <X size={17} />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => startEdit(item)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-yellow-300/40 px-4 text-sm font-black text-yellow-200 hover:bg-yellow-300/10">
                    <Pencil size={17} />
                    Editar
                  </button>
                )}
                <button type="button" onClick={() => remove(item.id)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-400/30 px-4 text-sm font-black text-red-200 hover:bg-red-500/10">
                  <Trash2 size={17} />
                  Excluir
                </button>
              </div>
            </article>
          );
        })}

        {!items.length ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-black/25 p-4 text-sm text-neutral-300">
            Nenhum Procura-se registrado.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function wantedRequestErrorMessage(data: any, fallback: string) {
  if (typeof data?.error === "string" && data.error !== "validation_error") return data.error;
  const details = data?.details?.fieldErrors;
  if (details && typeof details === "object") {
    const first = Object.values(details).flat().find(Boolean);
    if (first) return String(first);
  }
  return fallback;
}
