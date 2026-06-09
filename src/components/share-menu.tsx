"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

type ShareChannel = "whatsapp" | "copy" | "social";

const options: Array<{ channel: ShareChannel; label: string; icon: "whatsapp" | "copy" | "share"; color: string }> = [
  { channel: "whatsapp", label: "WhatsApp", icon: "whatsapp", color: "bg-[#22C55E] text-white" },
  { channel: "copy", label: "Copiar Link", icon: "copy", color: "bg-yellow-300 text-black" },
  { channel: "social", label: "Redes Sociais", icon: "share", color: "bg-blue-500 text-white" }
];

export function ShareMenu({ slug, title, compact = false }: { slug: string; title: string; compact?: boolean }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 8, top: 8 });
  const url = useMemo(() => {
    const version = Date.now().toString(36);
    if (typeof window === "undefined") return `/anuncios/${slug}?v=${version}`;
    return `${window.location.origin}/anuncios/${slug}?v=${version}`;
  }, [slug]);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuWidth = 224;
      const margin = 8;
      const left = Math.min(
        Math.max(margin, rect.right - menuWidth),
        Math.max(margin, window.innerWidth - menuWidth - margin)
      );
      const top = Math.min(rect.bottom + margin, Math.max(margin, window.innerHeight - 190));
      setMenuPosition({ left, top });
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updateMenuPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
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
        ref={buttonRef}
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
        <div
          className="fixed z-50 w-56 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 p-1 text-white shadow-2xl"
          style={{ left: menuPosition.left, top: menuPosition.top }}
        >
          {options.map((option) => (
            <button
              key={option.channel}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void share(option.channel);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold hover:bg-white/10"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${option.color}`}>
                {option.icon === "copy" ? <Copy size={16} /> : option.icon === "share" ? <Share2 size={16} /> : <MessageCircle size={16} />}
              </span>
              {copied && option.channel === "copy" ? "Link copiado" : option.label}
              {copied && option.channel === "copy" && <Check className="ml-auto text-green-400" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
