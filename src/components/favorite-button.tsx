"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function FavoriteButton({ slug, initialFavorited = false }: { slug: string; initialFavorited?: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFavorite() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    const nextFavorited = !favorited;
    setFavorited(nextFavorited);

    const response = await fetch(`/api/listings/${slug}/favorite`, {
      method: nextFavorited ? "POST" : "DELETE"
    }).catch(() => null);

    if (response?.status === 401) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/entrar?next=${encodeURIComponent(next)}`;
      return;
    }

    if (!response?.ok) {
      setFavorited(!nextFavorited);
      setMessage("Não foi possível salvar.");
      setTimeout(() => setMessage(""), 1800);
    }

    setBusy(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        title={favorited ? "Remover dos favoritos" : "Favoritar"}
        aria-label={favorited ? "Remover dos favoritos" : "Favoritar"}
        aria-pressed={favorited}
        disabled={busy}
        onClick={toggleFavorite}
        className={`grid h-12 w-12 place-items-center rounded-full backdrop-blur transition ${
          favorited
            ? "bg-yellow-300 text-black shadow-[0_0_18px_rgb(255_214_0_/_0.35)]"
            : "bg-black/45 text-white hover:bg-yellow-300 hover:text-black"
        } ${busy ? "opacity-70" : ""}`}
      >
        <Heart size={24} fill={favorited ? "currentColor" : "none"} />
      </button>
      {message ? (
        <span className="absolute right-0 top-full mt-2 w-36 rounded-md bg-black/85 px-2 py-1 text-center text-[11px] font-bold text-white shadow">
          {message}
        </span>
      ) : null}
    </div>
  );
}
