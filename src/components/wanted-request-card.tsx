"use client";

import { Check, Clock, Copy, Download, MessageCircle, Search, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type WantedRequestCardItem = {
  id: string;
  title: string;
  description: string;
  expiresAt: string;
  owner: {
    name: string;
    city: string | null;
    state: string | null;
  };
};

export function WantedRequestCard({ request }: { request: WantedRequestCardItem }) {
  const [chatPromptOpen, setChatPromptOpen] = useState(false);
  const [chatStatus, setChatStatus] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const promptTimerRef = useRef<number | null>(null);
  const location = [request.owner.city, request.owner.state].filter(Boolean).join("/");
  const ownerFirstName = firstName(request.owner.name);
  const remaining = formatRemaining(request.expiresAt);

  async function openChat() {
    setChatStatus("Abrindo o app...");
    setChatPromptOpen(false);

    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        window.location.href = "/mensagens";
        return;
      }
    } catch {
      // Browser users continue through the app-opening attempt below.
    }

    if (promptTimerRef.current) window.clearTimeout(promptTimerRef.current);
    const fallbackUrl = absoluteUrl("/baixar-app");
    const appUrl = absoluteUrl("/mensagens");

    const showDownloadPrompt = () => {
      if (document.hidden) return;
      setChatStatus("");
      setChatPromptOpen(true);
    };

    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes("android");
    promptTimerRef.current = window.setTimeout(showDownloadPrompt, 1600);

    if (isAndroid) {
      const parsed = new URL(appUrl);
      window.location.href = `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=br.com.acheix.app;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
      return;
    }

    window.location.href = appUrl;
  }

  return (
    <div className="rounded-[1rem] bg-[#FACC15] p-[2px] shadow-[0_0_22px_rgba(250,204,21,0.22)]">
      <article
        role="button"
        tabIndex={0}
        onClick={() => setPreviewOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setPreviewOpen(true);
          }
        }}
        className="grid cursor-pointer gap-3 rounded-[0.9rem] bg-[linear-gradient(145deg,#111_0%,#050505_58%,#181303_100%)] p-4 text-left shadow-xl shadow-black/20 transition hover:bg-[#141414]"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-yellow-300 text-black">
            <Search size={23} strokeWidth={2.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-yellow-300">PROCURO</p>
            <h3 className="mt-0.5 line-clamp-2 text-base font-black leading-snug text-white">{request.title}</h3>
          </div>
        </div>

        <p className="line-clamp-3 text-sm leading-relaxed text-neutral-300">{request.description}</p>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-neutral-400">
          <span>{ownerFirstName}{location ? ` · ${location}` : ""}</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} className="text-yellow-300" />
            {remaining}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
          <a href={`/api/wanted-requests/${request.id}/contact`} target="_blank" rel="noopener noreferrer" aria-label="Contato pelo WhatsApp" title="WhatsApp" className="inline-flex h-10 min-w-0 items-center justify-center rounded-full bg-[#22C55E] px-2 text-white transition hover:bg-[#34D399]">
            <WhatsAppIcon />
          </a>
          <button type="button" onClick={openChat} className="inline-flex h-10 min-w-0 items-center justify-center rounded-full bg-yellow-300 px-2 text-center text-sm font-black text-black transition hover:bg-yellow-200">
            Chat
          </button>
        </div>

        {chatStatus ? <p className="text-xs font-bold text-yellow-200">{chatStatus}</p> : null}

        {previewOpen ? (
          <WantedRequestPreview
            request={request}
            ownerFirstName={ownerFirstName}
            location={location}
            remaining={remaining}
            onClose={() => setPreviewOpen(false)}
            onChat={openChat}
          />
        ) : null}

        {chatPromptOpen ? <ChatDownloadPrompt onClose={() => setChatPromptOpen(false)} /> : null}
      </article>
    </div>
  );
}

function WantedRequestPreview({
  request,
  ownerFirstName,
  location,
  remaining,
  onClose,
  onChat
}: {
  request: WantedRequestCardItem;
  ownerFirstName: string;
  location: string;
  remaining: string;
  onClose: () => void;
  onChat: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 bg-black text-white sm:bottom-0 sm:top-[calc(4rem+env(safe-area-inset-top,0px))]" onClick={(event) => event.stopPropagation()}>
      <article className="relative h-full overflow-y-auto bg-[radial-gradient(circle_at_18%_22%,rgba(250,204,21,0.22),transparent_28%),linear-gradient(145deg,#17120a_0%,#050505_55%,#151515_100%)]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <button type="button" onClick={onClose} aria-label="Fechar Procuro" className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white shadow-xl backdrop-blur hover:bg-white/15">
          <X size={20} />
        </button>
        <div className="absolute right-5 top-[42%] z-20 -translate-y-1/2 sm:right-6">
          <WantedShareButton path={`/?procuro=${request.id}`} />
        </div>

        <div className="relative z-10 mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-10 sm:p-6">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase text-yellow-300">PROCURO</p>
            <h2 className="mt-2 line-clamp-4 text-4xl font-black leading-tight text-white drop-shadow sm:text-6xl">
              {request.title}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-neutral-100 drop-shadow sm:text-2xl">{request.description}</p>

            <div className="mt-4 grid gap-2 text-base font-bold text-neutral-100">
              <span>{ownerFirstName}{location ? ` · ${location}` : ""}</span>
              <span className="inline-flex items-center gap-2">
                <Clock size={18} className="text-yellow-300" />
                {remaining}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:flex">
            <a href={`/api/wanted-requests/${request.id}/contact`} target="_blank" rel="noopener noreferrer" aria-label="Contato pelo WhatsApp" title="WhatsApp" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#22C55E] px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(34,197,94,0.18)] transition hover:bg-[#34D399] sm:w-auto">
              <WhatsAppIcon />
              WhatsApp
            </a>
            <button type="button" onClick={onChat} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-sm font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.18)] transition hover:bg-yellow-200 sm:w-auto">
              <MessageCircle size={19} strokeWidth={2.5} />
              Chat
            </button>
          </div>
        </div>
      </article>
    </div>,
    document.body
  );
}

function WantedShareButton({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

  async function copyLink() {
    await navigator.clipboard?.writeText(shareUrl).catch(() => null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="grid h-16 w-16 touch-manipulation place-items-center rounded-full bg-black/65 text-white shadow-xl backdrop-blur transition active:scale-95 hover:bg-white/15"
        aria-label="Compartilhar Procuro"
        title="Compartilhar"
      >
        <Share2 size={30} strokeWidth={2.4} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-neutral-950 p-1 text-white shadow-2xl">
          <button type="button" onClick={openWhatsApp} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-white/10">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#22C55E] text-white"><MessageCircle size={16} /></span>
            WhatsApp
          </button>
          <button type="button" onClick={() => void copyLink()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-white/10">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-yellow-300 text-black">{copied ? <Check size={16} /> : <Copy size={16} />}</span>
            {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ChatDownloadPrompt({ onClose }: { onClose: () => void }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/75 px-4 py-6" onClick={(event) => event.stopPropagation()}>
      <div className="w-full max-w-sm rounded-2xl border border-yellow-300/25 bg-[#111] p-5 text-white shadow-2xl shadow-black">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-yellow-300">Chat Achei X</p>
            <h4 className="mt-1 text-xl font-black">Baixe o App para Conversar</h4>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Fechar aviso">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          Se o app não abriu automaticamente, baixe ou atualize o Achei X para usar o chat.
        </p>
        <a href="/baixar-app" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#22C55E] px-4 text-sm font-black text-black transition hover:bg-[#34D399]">
          <Download size={18} strokeWidth={2.5} />
          Baixar App
        </a>
      </div>
    </div>,
    document.body
  );
}

function absoluteUrl(path: string) {
  const origin = typeof window === "undefined" ? "https://acheix.com.br" : window.location.origin;
  return new URL(path, origin).toString();
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}

function formatRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  const hours = Math.ceil(diff / 3600000);
  if (hours < 48) return `${hours}h`;
  return `${Math.ceil(hours / 24)} dias`;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M12.04 2.5a9.45 9.45 0 0 0-8.06 14.37L2.75 21.5l4.75-1.21a9.43 9.43 0 1 0 4.54-17.79Zm0 17.22c-1.51 0-2.97-.43-4.22-1.24l-.31-.2-2.82.72.74-2.74-.21-.33a7.76 7.76 0 1 1 6.82 3.79Zm4.39-5.82c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.39-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.15 1.51.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}
