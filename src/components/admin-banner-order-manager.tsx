"use client";

import { useState } from "react";

type AdminBanner = {
  campaignId: string;
  userId: string;
  campaignTitle: string;
  mediaUrl: string;
  displayOrder?: number | null;
  updatedAt: string;
};

export function AdminBannerOrderManager({ banners }: { banners: AdminBanner[] }) {
  const [orderingId, setOrderingId] = useState<string | null>(null);

  async function moveBanner(campaignId: string, direction: "up" | "down") {
    setOrderingId(`${campaignId}:${direction}`);
    try {
      const response = await fetch("/api/admin/banner-campaigns/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId, direction })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível alterar a ordem geral.");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível alterar a ordem geral.");
    } finally {
      setOrderingId(null);
    }
  }

  if (!banners.length) {
    return <p className="mt-4 text-sm text-neutral-400">Nenhum banner ativo para ordenar.</p>;
  }

  return (
    <div className="mt-4 grid gap-3">
      {banners.map((banner, index) => (
        <article key={banner.campaignId} className="grid gap-3 rounded-lg border border-white/10 bg-black/30 p-3 text-sm md:grid-cols-[120px_1fr_auto]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            {banner.mediaUrl ? <img src={banner.mediaUrl} alt="" className="h-20 w-full object-cover" /> : <div className="h-20 bg-neutral-900" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-yellow-300">Ordem {banner.displayOrder ?? 1000}</p>
            <h3 className="truncate text-base font-black text-white">{banner.campaignTitle}</h3>
            <p className="mt-1 break-all text-xs text-neutral-500">Campanha: {banner.campaignId}</p>
            <p className="mt-1 break-all text-xs text-neutral-500">Usuário: {banner.userId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => moveBanner(banner.campaignId, "up")}
              disabled={index === 0 || Boolean(orderingId)}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {orderingId === `${banner.campaignId}:up` ? "Movendo..." : "Subir"}
            </button>
            <button
              type="button"
              onClick={() => moveBanner(banner.campaignId, "down")}
              disabled={index === banners.length - 1 || Boolean(orderingId)}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {orderingId === `${banner.campaignId}:down` ? "Movendo..." : "Descer"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

