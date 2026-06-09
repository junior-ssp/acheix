"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Share2, X } from "lucide-react";

type ShareChannel = "whatsapp" | "copy" | "social";

const options: Array<{ channel: ShareChannel; label: string; icon: "whatsapp" | "copy" | "share"; color: string }> = [
  { channel: "whatsapp", label: "WhatsApp", icon: "whatsapp", color: "bg-[#22C55E] text-white" },
  { channel: "copy", label: "Copiar Link", icon: "copy", color: "bg-yellow-300 text-black" },
  { channel: "social", label: "Redes Sociais", icon: "share", color: "bg-blue-500 text-white" }
];

export function ShareMenu({ slug, title, compact = false }: { slug: string; title: string; compact?: boolean }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    const version = Date.now().toString(36);
    if (typeof window === "undefined") return `/anuncios/${slug}?v=${version}`;
    return `${window.location.origin}/anuncios/${slug}?v=${version}`;
  }, [slug]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function registerShare(channel: ShareChannel) {
    await fetch(`/api/listings/${slug}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel })
    }).catch(() => null);
  }

  async function share(channel: ShareChannel) {
    await registerShare(channel);

    if (channel === "copy") {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      return;
    }

    if (channel === "social") {
      if (navigator.share) {
        await navigator.share({ title, url }).catch(() => null);
      } else {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
      }
      setOpen(false);
      return;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        title="Compartilhar"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={compact ? "grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white shadow backdrop-blur" : "grid h-12 w-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur"}
      >
        <Share2 size={compact ? 18 : 24} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar compartilhamento"
            className="fixed inset-0 z-40 cursor-default bg-black/65 backdrop-blur-sm"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Compartilhar anúncio"
            className="fixed left-1/2 top-1/2 z-50 w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-neutral-950 p-3 text-white shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-yellow-300">Compartilhar</p>
                <p className="truncate text-sm font-black text-white">{title}</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            {options.map((option) => (
              <button
                key={option.channel}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void share(option.channel);
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold hover:bg-white/10"
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${option.color}`}>
                  {option.icon === "copy" ? <Copy size={16} /> : option.icon === "share" ? <Share2 size={16} /> : <MessageCircle size={16} />}
                </span>
                {copied && option.channel === "copy" ? "Link copiado" : option.label}
                {copied && option.channel === "copy" && <Check className="ml-auto text-green-400" size={16} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
