"use client";

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent } from "react";
import Link from "next/link";
import { Eye, ImagePlus, Loader2, RefreshCw, Trash2, Zap } from "lucide-react";
import { uploadListingPhoto } from "@/lib/supabase-client";
import { extractYouTubeVideoId } from "@/lib/youtube-embed";

type Campaign = {
  campaignId: string;
  status: "DRAFT" | "PENDING_PAYMENT" | "ACTIVE" | "REMOVED";
  campaignTitle: string;
  destinationUrl: string;
  mediaUrl: string;
  bannerImagePositionY?: number | null;
  imageZoom?: number | null;
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  rainbowBorderEnabled?: boolean | null;
  displayOrder?: number | null;
  planType: string;
  amountCents: number;
  startsAt: string | null;
  endsAt: string | null;
  paymentId: string | null;
};

export function BannerCampaignsManager({ campaigns }: { campaigns: Campaign[] }) {
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const visibleCampaigns = campaigns.filter((campaign) => campaign.status !== "REMOVED" && !removedIds.has(campaign.campaignId));
  const [orderingId, setOrderingId] = useState<string | null>(null);

  async function moveCampaign(campaignId: string, direction: "up" | "down") {
    setOrderingId(`${campaignId}:${direction}`);
    try {
      const response = await fetch("/api/banner-campaigns/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId, direction })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível alterar a ordem.");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível alterar a ordem.");
    } finally {
      setOrderingId(null);
    }
  }

  if (!visibleCampaigns.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p className="font-black">Você ainda não tem banners.</p>
        <p className="mt-1 text-sm text-neutral-400">Crie uma campanha, confira a prévia e pague para aparecer no carrossel.</p>
        <Link href="/anunciar-banner" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black">
          Criar banner
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {visibleCampaigns.map((campaign, index) => (
        <CampaignEditor
          key={campaign.campaignId}
          campaign={campaign}
          canMoveUp={index > 0}
          canMoveDown={index < visibleCampaigns.length - 1}
          orderingId={orderingId}
          onMoveOrder={moveCampaign}
          onRemoved={() => setRemovedIds((current) => new Set(current).add(campaign.campaignId))}
        />
      ))}
    </div>
  );
}

function CampaignEditor({
  campaign,
  canMoveUp,
  canMoveDown,
  orderingId,
  onMoveOrder,
  onRemoved
}: {
  campaign: Campaign;
  canMoveUp: boolean;
  canMoveDown: boolean;
  orderingId: string | null;
  onMoveOrder: (campaignId: string, direction: "up" | "down") => void;
  onRemoved: () => void;
}) {
  const [title, setTitle] = useState(campaign.campaignTitle);
  const [destinationUrl, setDestinationUrl] = useState(campaign.destinationUrl);
  const [mediaUrl, setMediaUrl] = useState(campaign.mediaUrl);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewVersion, setPreviewVersion] = useState(Date.now());
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState<Date | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(() => clampZoom(campaign.imageZoom ?? 1));
  const [imagePositionX, setImagePositionX] = useState(() => clampPercent(campaign.imagePositionX ?? 50));
  const [imagePositionY, setImagePositionY] = useState(() => clampPercent(campaign.imagePositionY ?? campaign.bannerImagePositionY ?? 50));
  const [rainbowBorderEnabled, setRainbowBorderEnabled] = useState(Boolean(campaign.rainbowBorderEnabled));
  const frameDragRef = useRef<{ startX: number; startY: number; startPositionX: number; startPositionY: number } | null>(null);
  const active = campaign.status === "ACTIVE" && Boolean(campaign.endsAt) && Date.parse(campaign.endsAt ?? "") > Date.now();
  const versionedMediaUrl = useMemo(() => withCacheBuster(mediaUrl, previewVersion), [mediaUrl, previewVersion]);
  const previewImageUrl = previewUrl || versionedMediaUrl;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setMessage(null);

    if (!["image/webp", "image/jpeg", "image/png"].includes(file.type)) {
      setMessage("Envie imagem em WebP, JPG ou PNG.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 3 MB.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return localPreviewUrl;
    });
    setPreviewUpdatedAt(new Date());
    setUploading(true);
    try {
      const uploaded = await uploadListingPhoto(file);
      setMediaUrl(uploaded.url);
      setMessage("Upload concluído ✔ Atualizando prévia...");
      window.setTimeout(() => refreshPreview(uploaded.url), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function refreshPreview(url = mediaUrl) {
    if (!url) return;
    const version = Date.now();
    const nextUrl = withCacheBuster(url, version);
    setRefreshingPreview(true);
    setPreviewVersion(version);
    await preloadImage(nextUrl).catch(() => null);
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    setPreviewUpdatedAt(new Date());
    setMessage("Prévia atualizada ✔");
    setRefreshingPreview(false);
  }

  async function forceRefreshPreview() {
    if (!mediaUrl) return;
    const version = Date.now();
    const nextUrl = withCacheBuster(mediaUrl, version);
    setRefreshingPreview(true);
    setPreviewVersion(version);
    try {
      const response = await fetch(nextUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao baixar imagem.");
      const blob = await response.blob();
      const forcedUrl = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        return forcedUrl;
      });
      setPreviewUpdatedAt(new Date());
      setMessage("Prévia forçada atualizada ✔");
    } catch {
      setMessage("Não consegui baixar novamente. Usei URL versionada.");
      setPreviewUrl("");
    } finally {
      setRefreshingPreview(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/banner-campaigns/${campaign.campaignId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignTitle: title, destinationUrl, mediaUrl, bannerImagePositionY: imagePositionY, imageZoom, imagePositionX, imagePositionY, rainbowBorderEnabled })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível salvar.");
      setMessage(data?.message ?? "Banner atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function startImagePositionDrag(event: PointerEvent<HTMLDivElement>) {
    if (!previewImageUrl || !active) return;
    frameDragRef.current = { startX: event.clientX, startY: event.clientY, startPositionX: imagePositionX, startPositionY: imagePositionY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveImagePositionDrag(event: PointerEvent<HTMLDivElement>) {
    const start = frameDragRef.current;
    if (!start) return;
    const height = Math.max(1, event.currentTarget.clientHeight);
    const width = Math.max(1, event.currentTarget.clientWidth);
    const deltaXPercent = ((event.clientX - start.startX) / width) * 100;
    const deltaYPercent = ((event.clientY - start.startY) / height) * 100;
    setImagePositionX(clampPercent(start.startPositionX + deltaXPercent));
    setImagePositionY(clampPercent(start.startPositionY + deltaYPercent));
    setPreviewUpdatedAt(new Date());
  }

  function finishImagePositionDrag(event: PointerEvent<HTMLDivElement>) {
    frameDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Alguns navegadores liberam automaticamente.
    }
  }

  async function removeBanner() {
    if (!window.confirm("Remover este banner da exibição? Ele deixará de aparecer na home.")) return;
    setRemoving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/banner-campaigns/${campaign.campaignId}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível remover o banner.");
      setMessage(data?.message ?? "Banner removido da exibição.");
      onRemoved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o banner.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">{campaign.planType}</p>
          <h2 className="mt-1 text-2xl font-black">{campaign.campaignTitle}</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Status: <strong className={active ? "text-emerald-300" : "text-yellow-200"}>{statusLabel(campaign.status)}</strong>
            {campaign.endsAt ? ` · ativo até ${new Date(campaign.endsAt).toLocaleDateString("pt-BR")}` : ""}
          </p>
        </div>
        {campaign.status === "PENDING_PAYMENT" && campaign.paymentId ? (
          <Link href={`/pagamento?paymentId=${campaign.paymentId}`} className="inline-flex h-10 items-center justify-center rounded-full bg-yellow-300 px-4 text-xs font-black text-black">
            Pagar agora
          </Link>
        ) : null}
      </div>

      <div className={`mt-4 overflow-hidden rounded-3xl bg-black ${rainbowBorderEnabled ? "acheix-rainbow-banner p-[3px]" : "border border-yellow-300/20"}`}>
        <div
          className="relative min-h-32 overflow-hidden rounded-[calc(1.5rem-3px)] bg-black sm:min-h-40"
          onPointerDown={startImagePositionDrag}
          onPointerMove={moveImagePositionDrag}
          onPointerUp={finishImagePositionDrag}
          onPointerCancel={finishImagePositionDrag}
          style={{ touchAction: active ? "none" : "auto" }}
        >
          <img
            key={previewImageUrl}
            src={previewImageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full select-none object-cover"
            draggable={false}
            style={{
              objectPosition: `${imagePositionX}% ${imagePositionY}%`,
              transform: `scale(${imageZoom})`,
              transformOrigin: `${imagePositionX}% ${imagePositionY}%`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-black/20" />
          <div className="relative flex min-h-32 items-center justify-between gap-3 px-5 py-4 sm:min-h-40 sm:px-8">
            <div>
              <p className="text-xs font-black uppercase text-emerald-300">Espaço patrocinado</p>
              <p className="mt-1 max-w-xl text-2xl font-black text-white sm:text-4xl">{title}</p>
            </div>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-lg font-black text-black">AD</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-black text-white">Borda multicolorida</span>
            <span className="block text-xs text-neutral-400">Liga ou desliga o efeito visual especial em volta da caixa do banner.</span>
          </span>
          <input
            type="checkbox"
            checked={rainbowBorderEnabled}
            disabled={!active}
            onChange={(event) => setRainbowBorderEnabled(event.target.checked)}
            className="h-6 w-6 accent-yellow-300 disabled:opacity-50"
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-white">Enquadramento da imagem</p>
            <p className="text-xs text-neutral-400">Arraste a imagem na prévia, ajuste X/Y e use zoom. X {imagePositionX}% · Y {imagePositionY}% · Zoom {imageZoom.toFixed(2)}x.</p>
          </div>
          <button type="button" onClick={() => {
            setImageZoom(1);
            setImagePositionX(50);
            setImagePositionY(50);
            setPreviewUpdatedAt(new Date());
          }} disabled={!active} className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-xs font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
            Centralizar imagem
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <FrameRange label="Zoom" min={1} max={3} step={0.05} value={imageZoom} disabled={!active} onChange={(value) => {
            setImageZoom(clampZoom(value));
            setPreviewUpdatedAt(new Date());
          }} />
          <FrameRange label="Posição X" min={0} max={100} step={1} value={imagePositionX} disabled={!active} onChange={(value) => {
            setImagePositionX(clampPercent(value));
            setPreviewUpdatedAt(new Date());
          }} />
          <FrameRange label="Posição Y" min={0} max={100} step={1} value={imagePositionY} disabled={!active} onChange={(value) => {
            setImagePositionY(clampPercent(value));
            setPreviewUpdatedAt(new Date());
          }} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-black">Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!active} className="input" maxLength={80} required />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black">Link de Destino:</span>
          <input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} disabled={!active} className="input" required />
          <span className="text-xs text-neutral-400">{extractYouTubeVideoId(destinationUrl) ? "Links do YouTube abrirão fora do app/site." : "Links comuns continuam abrindo normalmente."}</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-black text-white hover:bg-white/10 ${!active || uploading ? "pointer-events-none opacity-60" : ""}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Trocar imagem
          <input type="file" accept="image/webp,image/jpeg,image/png" disabled={!active || uploading} onChange={handleFileChange} className="sr-only" />
        </label>
        <button disabled={!active || saving || uploading} className="inline-flex h-11 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
        <button type="button" onClick={removeBanner} disabled={removing} className="inline-flex h-11 items-center gap-2 rounded-full border border-red-400/35 px-4 text-sm font-black text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60">
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir banner
        </button>
        <button type="button" onClick={() => refreshPreview()} disabled={!mediaUrl || refreshingPreview} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-black text-white disabled:opacity-50">
          {refreshingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar Prévia
        </button>
        <button type="button" onClick={forceRefreshPreview} disabled={!mediaUrl || refreshingPreview} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#22C55E] px-4 text-sm font-black text-black disabled:opacity-50">
          {refreshingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Forçar Atualização
        </button>
        <button type="button" onClick={() => setShowFullPreview(true)} disabled={!previewImageUrl} className="inline-flex h-11 items-center gap-2 rounded-full bg-yellow-300 px-4 text-sm font-black text-black disabled:opacity-50">
          <Eye className="h-4 w-4" />
          Visualizar Banner
        </button>
        <button type="button" onClick={() => onMoveOrder(campaign.campaignId, "up")} disabled={!canMoveUp || Boolean(orderingId)} className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm font-black text-white disabled:opacity-50">
          {orderingId === `${campaign.campaignId}:up` ? "Movendo..." : "Mover para cima"}
        </button>
        <button type="button" onClick={() => onMoveOrder(campaign.campaignId, "down")} disabled={!canMoveDown || Boolean(orderingId)} className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm font-black text-white disabled:opacity-50">
          {orderingId === `${campaign.campaignId}:down` ? "Movendo..." : "Mover para baixo"}
        </button>
      </div>
      <p className="mt-3 break-all text-xs text-neutral-500">
        Última atualização: {previewUpdatedAt ? previewUpdatedAt.toLocaleString("pt-BR") : "ainda não atualizada"} · URL: {previewImageUrl}
      </p>

      {!active ? (
        <p className="mt-3 rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-sm font-bold text-yellow-100">
          Edição liberada somente quando o banner estiver pago e ativo.
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm font-bold text-yellow-100">{message}</p> : null}
      {showFullPreview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
          <div className="w-full max-w-6xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-black text-white">Visualização real do banner</p>
              <button type="button" onClick={() => setShowFullPreview(false)} className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">Fechar</button>
            </div>
            <div className={`overflow-hidden rounded-3xl bg-black ${rainbowBorderEnabled ? "acheix-rainbow-banner p-[3px]" : "border border-yellow-300/25"}`}>
              <div className="relative min-h-32 overflow-hidden rounded-[calc(1.5rem-3px)] bg-black sm:min-h-40 lg:min-h-44">
                <img key={`full-${previewImageUrl}`} src={previewImageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${imagePositionX}% ${imagePositionY}%`, transform: `scale(${imageZoom})`, transformOrigin: `${imagePositionX}% ${imagePositionY}%` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/20" />
                <div className="relative flex min-h-32 items-center justify-between gap-3 px-5 py-4 sm:min-h-40 lg:min-h-44 lg:px-8">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-300">Espaço patrocinado</p>
                    <p className="mt-1 text-2xl font-black text-white sm:text-4xl lg:text-5xl">{title}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-200 sm:text-sm">Espaço patrocinado Achei X.</p>
                  </div>
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-lg font-black text-black sm:h-16 sm:w-16 sm:text-xl">AD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function statusLabel(status: Campaign["status"]) {
  return status === "ACTIVE" ? "Ativo" : status === "PENDING_PAYMENT" ? "Aguardando pagamento" : "Rascunho";
}

function withCacheBuster(url: string, version: number) {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(version));
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
  }
}

function preloadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Falha ao carregar imagem."));
    image.src = url;
  });
}

function FrameRange({
  label,
  min,
  max,
  step,
  value,
  disabled,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-black text-neutral-300">
      <span>{label}: {label === "Zoom" ? `${value.toFixed(2)}x` : `${Math.round(value)}%`}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="w-full accent-yellow-300 disabled:opacity-50"
      />
    </label>
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampZoom(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(3, Math.round(value * 100) / 100));
}
