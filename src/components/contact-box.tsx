"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, LogIn, MessageCircle, Pencil, Phone, Send, Trash2, X } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

type PublicContact = {
  phone: string | null;
  whatsapp: string | null;
  whatsapp2: string | null;
  email: string | null;
};

type ChatMessage = {
  id: string;
  conversationId?: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  readAt?: string | null;
  pending?: boolean;
  failed?: boolean;
};

type ChatConversation = {
  id: string;
  interestedUserId: string;
  updatedAt: string;
  safetyNotice?: string | null;
  interestedUser?: { name?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null } | null;
  messages: ChatMessage[];
};

export function ContactBox({
  slug,
  authenticated,
  currentUserId,
  contact,
  canInteract = authenticated,
  interactionDisabledReason
}: {
  slug: string;
  authenticated: boolean;
  currentUserId: string | null;
  contact: PublicContact;
  canInteract?: boolean;
  interactionDisabledReason?: string;
}) {
  const nextPath = `/anuncios/${slug}`;
  const [interestMessage, setInterestMessage] = useState("");
  const [message, setMessage] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const preferredWhatsapp = contact.whatsapp ?? contact.whatsapp2;
  const bestCopyContact = preferredWhatsapp ?? contact.phone ?? contact.email;
  const hasExternalContact = Boolean(bestCopyContact);
  const blockedMessage = interactionDisabledReason ?? "Atualize seu perfil para interagir com o anunciante.";

  function sendInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canInteract) {
      setMessage(blockedMessage);
      return;
    }
    const text = interestMessage.trim();
    setMessage("");
    if (!text) {
      setMessage("Escreva uma mensagem antes de enviar.");
      return;
    }
    if (!preferredWhatsapp) {
      setMessage("WhatsApp não liberado pelo anunciante, use o CHAT.");
      return;
    }
    const listingUrl = new URL(`/anuncios/${slug}`, window.location.origin).toString();
    const finalMessage = `Como vai, tudo bem? Tenho interesse em seu anúncio "${listingUrl}".\n\n${text}`;
    window.open(`https://wa.me/55${onlyDigits(preferredWhatsapp)}?text=${encodeURIComponent(finalMessage)}`, "_blank", "noopener,noreferrer");
  }

  async function copyContact() {
    if (!canInteract) {
      setMessage(blockedMessage);
      return;
    }
    if (!bestCopyContact) {
      setMessage("Nenhum contato externo foi liberado pelo anunciante.");
      return;
    }
    await navigator.clipboard?.writeText(bestCopyContact).catch(() => null);
    setMessage("Contato copiado.");
  }

  if (!authenticated) {
    return (
      <div className="mt-3 grid gap-3 rounded-md border border-black/10 bg-white/30 p-3 text-sm">
        <p className="flex items-center gap-2 font-bold text-black">
          <LogIn size={16} /> Entre ou crie sua conta para interagir com o anunciante.
        </p>
        <a href={`/cadastro?next=${encodeURIComponent(nextPath)}`} className="inline-flex h-11 items-center justify-center rounded-md btn-gold">Criar Conta</a>
        <a href={`/entrar?next=${encodeURIComponent(nextPath)}`} className="inline-flex h-11 items-center justify-center rounded-md border border-black/15 bg-white/60 font-black text-black">Entrar</a>
      </div>
    );
  }

  return (
    <div className="acheix-glass-panel mt-3 grid gap-3 rounded-3xl p-3">
      {!canInteract ? (
        <div className="rounded-md border border-black/10 bg-white/30 p-3 text-sm font-bold text-black">
          <p className="flex items-center gap-2">
            <LogIn size={16} /> {blockedMessage}
          </p>
          <a href="/dashboard" className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md btn-gold">Atualizar perfil</a>
        </div>
      ) : null}
      {hasExternalContact ? <form onSubmit={sendInterest} className="grid gap-2">
        <textarea
          value={interestMessage}
          onChange={(event) => setInterestMessage(event.target.value)}
          maxLength={280}
          rows={4}
          placeholder={preferredWhatsapp ? "Escreva seu interesse para abrir no WhatsApp" : "WhatsApp não liberado pelo anunciante, use o CHAT"}
          className="min-h-28 w-full rounded-2xl border border-yellow-300/20 bg-black/55 p-3 text-white outline-none placeholder:text-neutral-500 focus:border-yellow-300 focus:shadow-[0_0_20px_rgba(250,204,21,0.12)]"
        />
        <button disabled={canInteract && !preferredWhatsapp} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-3 font-black text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)] backdrop-blur-xl hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-45">
          <Send size={17} />
          Enviar Interesse
        </button>
        <button type="button" onClick={() => setChatOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-400/15 px-3 font-black text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.16)] backdrop-blur-xl hover:bg-emerald-400/25">
          <MessageCircle size={17} />
          CHAT
        </button>
      </form> : (
        <button type="button" onClick={() => setChatOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-400/15 px-3 font-black text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.16)] backdrop-blur-xl hover:bg-emerald-400/25">
          <MessageCircle size={18} />
          CHAT
        </button>
      )}

      {hasExternalContact ? <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => canInteract ? setContactOpen((current) => !current) : setMessage(blockedMessage)} className="inline-flex h-10 items-center justify-center rounded-full border border-yellow-300/25 bg-white/[0.06] px-3 text-sm font-black text-white backdrop-blur-xl">
          Ver Contato
        </button>
        <button type="button" onClick={copyContact} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 text-sm font-black text-emerald-100 backdrop-blur-xl">
          <Copy size={16} />
          Copiar Contato
        </button>
        {contact.phone ? (
          <a href={`tel:+55${onlyDigits(contact.phone)}`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-black/15 bg-white/80 px-3 text-sm font-black text-black">
            <Phone size={16} />
            Ligar
          </a>
        ) : null}
      </div> : null}

      {contactOpen ? <ContactDetails contact={contact} /> : null}
      {message ? <p className="text-sm font-bold text-black">{message}</p> : null}
      {chatOpen ? <ChatModal slug={slug} currentUserId={currentUserId} onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
}

function ContactDetails({ contact }: { contact: PublicContact }) {
  if (!contact.whatsapp && !contact.whatsapp2 && !contact.phone && !contact.email) {
    return <p className="rounded-md border border-black/10 bg-white/70 p-3 text-sm font-bold text-black">O anunciante não liberou contato externo. Use o CHAT.</p>;
  }

  return (
    <div className="acheix-glass-panel grid gap-1 rounded-2xl p-3 text-sm text-white">
      {contact.whatsapp ? <p><strong>WhatsApp 1:</strong> {formatPhone(contact.whatsapp)}</p> : null}
      {contact.whatsapp2 ? <p><strong>WhatsApp 2:</strong> {formatPhone(contact.whatsapp2)}</p> : null}
      {contact.phone ? <p><strong>Telefone:</strong> {formatPhone(contact.phone)}</p> : null}
      {contact.email ? <p><strong>E-mail:</strong> {contact.email}</p> : null}
    </div>
  );
}

function ChatModal({ slug, currentUserId, onClose }: { slug: string; currentUserId: string | null; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [mode, setMode] = useState<"INTERESTED" | "OWNER">("INTERESTED");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [status, setStatus] = useState("Carregando...");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null;
  const visibleMessages = mode === "OWNER" ? activeConversation?.messages ?? [] : messages;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/listings/${slug}/chat`, { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setStatus(data?.error ?? "Não foi possível abrir o chat.");
          return;
        }
        if (data.mode === "OWNER") {
          const nextConversations = data.conversations ?? [];
          setMode("OWNER");
          setConversations(nextConversations);
          setActiveConversationId(nextConversations[0]?.id ?? null);
        } else {
          setMode("INTERESTED");
          setMessages(data.messages ?? []);
        }
        setStatus("");
      })
      .catch(() => !cancelled && setStatus("Não foi possível abrir o chat."));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, status]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    if (mode === "OWNER" && !activeConversation) {
      setStatus("Nenhuma conversa selecionada neste anúncio.");
      return;
    }

    const temporaryMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversation?.id,
      senderId: currentUserId ?? "me",
      body: text,
      createdAt: new Date().toISOString(),
      pending: true
    };

    setBody("");
    setStatus("Enviando...");
    if (mode === "OWNER" && activeConversation) {
      setConversations((current) => current.map((conversation) => conversation.id === activeConversation.id ? { ...conversation, messages: [...conversation.messages, temporaryMessage] } : conversation));
    } else {
      setMessages((current) => [...current, temporaryMessage]);
    }

    setBusy(true);
    const response = await fetch(`/api/listings/${slug}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text, conversationId: activeConversation?.id })
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setStatus(data?.error ?? "Não foi possível enviar.");
      if (mode === "OWNER" && activeConversation) {
        setConversations((current) => current.map((conversation) => conversation.id === activeConversation.id ? {
          ...conversation,
          messages: conversation.messages.map((item) => item.id === temporaryMessage.id ? { ...item, pending: false, failed: true } : item)
        } : conversation));
      } else {
        setMessages((current) => current.map((item) => item.id === temporaryMessage.id ? { ...item, pending: false, failed: true } : item));
      }
      return;
    }

    if (data.mode === "OWNER") {
      const nextConversations = data.conversations ?? [];
      setMode("OWNER");
      setConversations(nextConversations);
      setActiveConversationId((current) => current ?? nextConversations[0]?.id ?? null);
    } else {
      setMessages(data.messages ?? []);
    }
    setStatus("");
  }

  async function deleteConversation() {
    if (!activeConversation || !window.confirm("Excluir esta conversa deste anúncio?")) return;
    setStatus("Excluindo conversa...");
    const response = await fetch(`/api/listings/${slug}/chat?conversationId=${activeConversation.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setStatus("Não foi possível excluir agora.");
      return;
    }
    setConversations((current) => current.filter((conversation) => conversation.id !== activeConversation.id));
    setActiveConversationId(null);
    setStatus("");
  }

  function beginEditMessage(message: ChatMessage) {
    setEditingId(message.id);
    setEditBody(message.body);
  }

  async function saveMessageEdit(messageId: string) {
    const text = editBody.trim();
    if (!text || busy || messageId.startsWith("temp-")) return;
    setBusy(true);
    setStatus("Salvando edição...");
    const response = await fetch(`/api/listings/${slug}/chat?messageId=${messageId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text })
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setStatus(data?.error ?? "Não foi possível editar a mensagem.");
      return;
    }
    const editedAt = new Date().toISOString();
    if (mode === "OWNER" && activeConversation) {
      setConversations((current) => current.map((conversation) => conversation.id === activeConversation.id ? {
        ...conversation,
        messages: conversation.messages.map((item) => item.id === messageId ? { ...item, body: text, editedAt } : item)
      } : conversation));
    } else {
      setMessages((current) => current.map((item) => item.id === messageId ? { ...item, body: text, editedAt } : item));
    }
    setEditingId(null);
    setEditBody("");
    setStatus("");
  }

  async function deleteMessage(messageId: string) {
    if (messageId.startsWith("temp-")) return;
    const confirmed = window.confirm("Excluir esta mensagem? Ela só será removida se ainda não foi lida.");
    if (!confirmed) return;
    const conversationId = activeConversation?.id;
    setStatus("Excluindo mensagem...");
    const response = await fetch(`/api/listings/${slug}/chat?messageId=${messageId}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null);
      setStatus(data?.error ?? "Não foi possível excluir a mensagem.");
      return;
    }
    if (mode === "OWNER" && conversationId) {
      setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, messages: conversation.messages.filter((item) => item.id !== messageId) } : conversation));
    } else {
      setMessages((current) => current.filter((item) => item.id !== messageId));
    }
    if (editingId === messageId) {
      setEditingId(null);
      setEditBody("");
    }
    setStatus("");
  }

  async function reportConversation() {
    if (!activeConversation && mode === "OWNER") return;
    const conversationId = activeConversation?.id;
    if (!conversationId) {
      setStatus("Abra uma conversa para denunciar.");
      return;
    }
    setStatus("Registrando denúncia...");
    const response = await fetch(`/api/listings/${slug}/chat?conversationId=${conversationId}`, { method: "PATCH" }).catch(() => null);
    setStatus(response?.ok ? "Denúncia registrada para revisão." : "Não foi possível denunciar agora.");
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-end bg-black/80 p-3 backdrop-blur-md sm:place-items-center">
      <div className="acheix-glass-panel grid max-h-[88vh] w-full max-w-lg grid-rows-[auto_1fr_auto] overflow-hidden rounded-[2rem] text-white">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-yellow-300">Chat do anúncio</p>
              <h3 className="font-black">{mode === "OWNER" ? "Histórico deste anúncio" : "Conversa interna"}</h3>
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Fechar chat">
              <X size={18} />
            </button>
          </div>
          {mode === "OWNER" ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {conversations.map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => setActiveConversationId(conversation.id)} className={`h-9 shrink-0 rounded-full px-3 text-xs font-black ${conversation.id === activeConversation?.id ? "bg-yellow-300 text-black" : "bg-white/10 text-white"}`}>
                  {conversationLabel(conversation)}
                </button>
              ))}
              {activeConversation ? (
                <>
                  <button type="button" onClick={deleteConversation} className="h-9 shrink-0 rounded-full border border-red-400/40 px-3 text-xs font-black text-red-200">Excluir</button>
                  <button type="button" onClick={reportConversation} className="h-9 shrink-0 rounded-full border border-yellow-300/40 px-3 text-xs font-black text-yellow-200">Denunciar</button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid content-start gap-2 overflow-y-auto p-4">
          {mode === "OWNER" && activeConversation?.safetyNotice ? (
            <p className="rounded-md border border-yellow-300/30 bg-yellow-300/10 p-3 text-xs font-bold text-yellow-100">
              {activeConversation.safetyNotice}
            </p>
          ) : null}
          {visibleMessages.map((item) => {
            const mine = item.senderId === currentUserId;
            const editable = mine && !item.pending && !item.failed && !item.readAt;
            const editing = editingId === item.id;
            return (
              <div key={item.id} className={`relative max-w-[85%] rounded-lg px-3 py-2 text-left text-sm ${mine ? "ml-auto bg-yellow-300 text-black" : "bg-white/10 text-white"}`}>
                {editing ? (
                  <div className="grid min-w-[220px] gap-2">
                    <textarea autoFocus value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength={1000} className="min-h-20 w-full resize-none rounded-md bg-white/90 p-2 font-semibold text-black outline-none" />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setEditingId(null); setEditBody(""); }} className="grid h-8 w-8 place-items-center rounded-full bg-black/10" aria-label="Cancelar edição"><X size={16} /></button>
                      <button type="button" disabled={busy || !editBody.trim()} onClick={() => void saveMessageEdit(item.id)} className="grid h-8 w-8 place-items-center rounded-full bg-black text-yellow-300 disabled:opacity-50" aria-label="Salvar edição"><Check size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="block whitespace-pre-wrap">{item.body}</span>
                    <span className={`mt-1 block text-[10px] ${mine ? "text-black/60" : "text-white/50"}`}>{item.pending ? "Enviando..." : item.failed ? "Falhou. Tente novamente." : `${item.editedAt ? "editada · " : ""}${new Date(item.createdAt).toLocaleString("pt-BR")}${mine && item.readAt ? " · lida" : ""}`}</span>
                  </>
                )}
                {editable && !editing ? (
                  <div className="absolute -left-16 top-1/2 flex -translate-y-1/2 gap-1">
                    <button type="button" disabled={busy} onClick={() => beginEditMessage(item)} className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-neutral-900 text-yellow-300 shadow-lg disabled:opacity-50" aria-label="Editar mensagem"><Pencil size={13} /></button>
                    <button type="button" disabled={busy} onClick={() => void deleteMessage(item.id)} className="grid h-7 w-7 place-items-center rounded-full border border-red-400/30 bg-neutral-900 text-red-300 shadow-lg disabled:opacity-50" aria-label="Excluir mensagem"><Trash2 size={13} /></button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!visibleMessages.length && !status ? <p className="text-sm text-neutral-400">{mode === "OWNER" ? "Nenhuma conversa iniciada neste anúncio." : "Comece a conversa com o anunciante."}</p> : null}
          {status ? <p className="text-sm font-bold text-yellow-300">{status}</p> : null}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={sendMessage} className="grid gap-2 border-t border-white/10 p-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Escreva uma mensagem"
            className="w-full rounded-2xl border border-yellow-300/20 bg-black/55 p-3 text-white outline-none placeholder:text-neutral-500 focus:border-yellow-300 focus:shadow-[0_0_20px_rgba(250,204,21,0.12)]"
          />
          <button disabled={busy || !body.trim() || (mode === "OWNER" && !activeConversation)} className="h-11 rounded-full btn-gold shadow-[0_0_24px_rgba(250,204,21,0.18)] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Enviando..." : "Enviar no chat"}
          </button>
        </form>
      </div>
    </div>
  );
}

function conversationLabel(conversation: ChatConversation) {
  const user = conversation.interestedUser;
  const name = user?.name || user?.email || "Interessado";
  const last = conversation.messages[conversation.messages.length - 1]?.body?.trim();
  return last ? `${name}: ${last.slice(0, 28)}${last.length > 28 ? "..." : ""}` : name;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
