"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Send } from "lucide-react";
import { MessageBubble, type ThreadMessage } from "@/components/message-bubble";
import { syncMessageBadgeFromServer } from "@/lib/app-badge-client";

type Message = ThreadMessage;
type Conversation = {
  id: string; title: string; slug: string; category: string; city: string | null; state: string | null; imageUrl: string | null;
  otherUser: { id: string; name: string; email: string | null; phone: string | null };
  blockState: { blocked: boolean; blockedByCurrent: boolean; blockedByOther: boolean };
};

export function MessageThread({ conversationKey }: { conversationKey: string }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstScrollDoneRef = useRef(false);

  function scrollToLatest(behavior: ScrollBehavior = "smooth") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ block: "end", behavior });
      });
    });
  }

  async function load() {
    const response = await fetch(`/api/messages/conversations/${encodeURIComponent(conversationKey)}`, { cache: "no-store" }).catch(() => null);
    setLoading(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setStatus(data?.error ?? "Não foi possível abrir esta conversa.");
      return;
    }
    const data = await response.json().catch(() => null);
    setConversation(data?.conversation ?? null);
    setMessages(Array.isArray(data?.messages) ? data.messages : []);
    scrollToLatest(firstScrollDoneRef.current ? "smooth" : "auto");
    firstScrollDoneRef.current = true;
    await syncMessageBadgeFromServer();
    setStatus("");
  }

  useEffect(() => {
    firstScrollDoneRef.current = false;
    void load();
    const poll = window.setInterval(load, 12000);
    return () => { window.clearInterval(poll); };
  }, [conversationKey]);

  useEffect(() => {
    scrollToLatest(firstScrollDoneRef.current ? "smooth" : "auto");
    firstScrollDoneRef.current = true;
  }, [messages.at(-1)?.id]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleViewportChange = () => scrollToLatest("auto");
    viewport.addEventListener("resize", handleViewportChange);
    return () => viewport.removeEventListener("resize", handleViewportChange);
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || busy || conversation?.blockState.blocked) return;
    const temp: Message = { id: `temp-${Date.now()}`, body: text, createdAt: new Date().toISOString(), editedAt: null, readAt: null, mine: true, pending: true };
    setMessages((current) => [...current, temp]);
    setBody(""); setBusy(true); setStatus("");
    const response = await fetch(`/api/messages/conversations/${encodeURIComponent(conversationKey)}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: text })
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setStatus(data?.error ?? "Não foi possível enviar.");
      setMessages((current) => current.map((item) => item.id === temp.id ? { ...item, pending: false, failed: true } : item));
      return;
    }
    const data = await response.json().catch(() => null);
    setMessages(Array.isArray(data?.messages) ? data.messages : []);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function beginEdit(message: Message) { setEditingId(message.id); setEditBody(message.body); }

  async function saveEdit(messageId: string) {
    const text = editBody.trim();
    if (!text || busy) return;
    setBusy(true); setStatus("");
    const response = await fetch(`/api/messages/conversations/${encodeURIComponent(conversationKey)}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId, body: text })
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setStatus(data?.error ?? "Não foi possível editar a mensagem.");
      setEditingId(null);
      return;
    }
    const data = await response.json().catch(() => null);
    setMessages(Array.isArray(data?.messages) ? data.messages : []);
    setEditingId(null); setEditBody("");
  }

  async function deleteMessage(messageId: string) {
    if (busy) return;
    if (!window.confirm("Excluir esta mensagem? Ela só será removida se ainda não foi lida.")) return;
    setBusy(true); setStatus("");
    const response = await fetch(`/api/messages/conversations/${encodeURIComponent(conversationKey)}`, {
      method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId })
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setStatus(data?.error ?? "Não foi possível excluir a mensagem.");
      return;
    }
    const data = await response.json().catch(() => null);
    setMessages(Array.isArray(data?.messages) ? data.messages : []);
    if (editingId === messageId) { setEditingId(null); setEditBody(""); }
  }

  async function blockUser() {
    if (!conversation || conversation.blockState.blocked || busy) return;
    if (!window.confirm(`Bloquear ${conversation.otherUser.name}? O contato será encerrado para os dois lados.`)) return;
    setBusy(true);
    const response = await fetch(`/api/users/${conversation.otherUser.id}/block`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setStatus(data?.error ?? "Não foi possível bloquear este usuário.");
      return;
    }
    router.replace("/mensagens");
  }

  const blocked = Boolean(conversation?.blockState.blocked);
  return (
    <main className="acheix-neon-screen relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden pb-28 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.07),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.06),transparent_35%)]" />
      <ThreadHeader conversation={conversation} blocked={blocked} blockUser={blockUser} />
      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-5">
        {messages.length ? <p className="mx-auto mb-1 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">Conversa protegida pelo Achei X</p> : null}
        {messages.map((message) => <MessageBubble key={message.id} message={message} contactName={conversation?.otherUser.name ?? "Contato"} editing={editingId === message.id} editBody={editBody} setEditBody={setEditBody} beginEdit={beginEdit} cancelEdit={() => setEditingId(null)} saveEdit={saveEdit} deleteMessage={deleteMessage} busy={busy} />)}
        {!loading && !messages.length ? <div className="grid flex-1 place-items-center py-16 text-center"><div><p className="text-lg font-black">Comece a conversa</p><p className="mt-1 text-sm text-neutral-500">Escreva sua mensagem no campo abaixo.</p></div></div> : null}
        {loading ? <p className="py-12 text-center text-sm font-bold text-neutral-500">Carregando conversa...</p> : null}
        {blocked ? <p className="my-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-bold text-red-300">Contato bloqueado. O histórico permanece disponível, mas nenhuma das contas pode enviar novas mensagens.</p> : null}
        {status ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-center text-sm font-bold text-red-400">{status}</p> : null}
        <div ref={endRef} className="h-20 shrink-0 scroll-mb-20" />
      </section>
      <Composer inputRef={inputRef} body={body} setBody={setBody} blocked={blocked} busy={busy} send={send} />
    </main>
  );
}

function ThreadHeader({ conversation, blocked, blockUser }: { conversation: Conversation | null; blocked: boolean; blockUser: () => Promise<void> }) {
  return (
    <header className="acheix-glass-panel sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 rounded-b-[1.75rem] border-x-0 border-t-0 px-4 py-3 sm:top-[calc(4rem+env(safe-area-inset-top,0px))]">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <Link href="/mensagens" prefetch={false} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] transition hover:bg-white/10" aria-label="Voltar"><ArrowLeft size={20} /></Link>
        {conversation?.imageUrl ? <img src={conversation.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-black object-contain shadow-md" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-800 text-lg font-black">{conversation?.title?.charAt(0) ?? "A"}</span>}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black sm:text-lg">{conversation?.otherUser.name ?? "Conversa"}</h1>
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-neutral-400">{conversation?.title ?? "Carregando..."}</p>
        </div>
        {conversation && !blocked ? <button type="button" onClick={() => void blockUser()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-red-500/30 bg-red-500/5 text-red-400 transition hover:bg-red-500/15" aria-label="Bloquear usuário"><Ban size={18} /></button> : null}
      </div>
    </header>
  );
}

function Composer({ inputRef, body, setBody, blocked, busy, send }: {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  body: string;
  setBody: (value: string) => void;
  blocked: boolean;
  busy: boolean;
  send: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <form onSubmit={send} className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#090b0f]/95 px-3 pt-3 shadow-[0_-12px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl app-safe-bottom">
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        <textarea ref={inputRef} value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} maxLength={1000} disabled={blocked} placeholder={blocked ? "Conversa encerrada por bloqueio" : "Digite uma mensagem..."} className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl border border-white/15 bg-white/[0.06] px-5 py-3 text-base font-medium text-white outline-none placeholder:text-neutral-500 focus:border-yellow-300/70 focus:bg-white/[0.09] disabled:opacity-50" />
        <button disabled={busy || !body.trim() || blocked} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-lg shadow-yellow-500/15 transition active:scale-95 disabled:opacity-40" aria-label="Enviar mensagem"><Send size={20} strokeWidth={2.8} /></button>
      </div>
    </form>
  );
}
