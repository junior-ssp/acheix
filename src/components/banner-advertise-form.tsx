"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent } from "react";
import { CheckCircle2, Eye, ImagePlus, Loader2, PencilLine, QrCode, RefreshCw, Zap } from "lucide-react";
import { uploadListingPhoto } from "@/lib/supabase-client";

type BannerPlanType = "TOP_15" | "TOP_30";
type BannerPlacement = "CAROUSEL" | "DESKTOP_HERO";

type BannerPlan = {
  code: BannerPlanType;
  title: string;
  priceCents: number;
  days: number;
  maxPeriods: number;
  periodLabel: string;
};

const plans: BannerPlan[] = [
  { code: "TOP_15", title: "TOP 15", priceCents: 9900, days: 15, maxPeriods: 6, periodLabel: "quinzena" },
  { code: "TOP_30", title: "TOP 30", priceCents: 14900, days: 30, maxPeriods: 3, periodLabel: "mês" }
];

type Message = { type: "success" | "error"; text: string; checkoutUrl?: string } | null;

export function BannerAdvertiseForm({ authenticated, initialPlacement = "CAROUSEL" }: { authenticated: boolean; initialPlacement?: BannerPlacement }) {
  const [selectedPlan, setSelectedPlan] = useState<BannerPlanType>("TOP_15");
  const [placement, setPlacement] = useState<BannerPlacement>(initialPlacement);
  const [bannerQuantity, setBannerQuantity] = useState(1);
  const [periods, setPeriods] = useState(1);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewVersion, setPreviewVersion] = useState(Date.now());
  const [previewStatus, setPreviewStatus] = useState("Aguardando imagem.");
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState<Date | null>(null);
  const [previewSource, setPreviewSource] = useState<"local" | "server" | "forced" | "empty">("empty");
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePositionX, setImagePositionX] = useState(50);
  const [imagePositionY, setImagePositionY] = useState(50);
  const [rainbowBorderEnabled, setRainbowBorderEnabled] = useState(false);
  const frameDragRef = useRef<{ startX: number; startY: number; startPositionX: number; startPositionY: number } | null>(null);

  const plan = plans.find((item) => item.code === selectedPlan) ?? plans[0];
  const amountCents = useMemo(() => plan.priceCents * bannerQuantity * periods, [plan.priceCents, bannerQuantity, periods]);
  const durationDays = plan.days * periods;
  const previewTitle = campaignTitle.trim() || "Sua marca em destaque";
  const versionedMediaUrl = useMemo(() => withCacheBuster(mediaUrl, previewVersion), [mediaUrl, previewVersion]);
  const previewImageUrl = previewUrl || versionedMediaUrl;
  const diagnosticUrl = previewUrl || versionedMediaUrl || "Nenhuma imagem carregada";

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (placement === "DESKTOP_HERO") setBannerQuantity(1);
  }, [placement]);

  function selectPlan(code: BannerPlanType) {
    const next = plans.find((item) => item.code === code) ?? plans[0];
    setSelectedPlan(code);
    setPeriods((current) => Math.min(current, next.maxPeriods));
    setMessage(null);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setMessage(null);

    if (!["image/webp", "image/jpeg", "image/png"].includes(file.type)) {
      setMessage({ type: "error", text: "Envie imagem em WebP, JPG ou PNG." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage({ type: "error", text: "A imagem deve ter no máximo 3 MB." });
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return localPreviewUrl;
    });
    setPreviewSource("local");
    setPreviewUpdatedAt(new Date());
    setPreviewStatus("Prévia local carregada. Enviando imagem ao servidor...");
    setUploading(true);
    try {
      const uploaded = await uploadListingPhoto(file);
      setMediaUrl(uploaded.url);
      setMessage({ type: "success", text: "Upload concluído ✔ Atualizando a prévia..." });
      window.setTimeout(() => {
        refreshBannerPreview(uploaded.url);
      }, 500);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível enviar a imagem." });
      setPreviewStatus("Não foi possível concluir o upload.");
    } finally {
      setUploading(false);
    }
  }

  async function refreshBannerPreview(url = mediaUrl) {
    if (!url) {
      setPreviewStatus("Envie uma imagem para atualizar a prévia.");
      return;
    }

    const version = Date.now();
    const nextUrl = withCacheBuster(url, version);
    setRefreshingPreview(true);
    setPreviewStatus("Atualizando imagem...");
    setPreviewVersion(version);
    setPreviewSource("server");

    await preloadImage(nextUrl).catch(() => null);

    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    setPreviewUpdatedAt(new Date());
    setPreviewStatus("Prévia atualizada ✔");
    setRefreshingPreview(false);
  }

  async function forceRefreshBannerPreview() {
    if (!mediaUrl) {
      setPreviewStatus("Envie uma imagem para forçar a atualização.");
      return;
    }

    const version = Date.now();
    const nextUrl = withCacheBuster(mediaUrl, version);
    setRefreshingPreview(true);
    setPreviewStatus("Forçando atualização da imagem...");
    setPreviewVersion(version);

    try {
      const response = await fetch(nextUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Servidor não retornou a imagem.");
      const blob = await response.blob();
      const forcedPreviewUrl = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        return forcedPreviewUrl;
      });
      setPreviewSource("forced");
      setPreviewUpdatedAt(new Date());
      setPreviewStatus("Prévia atualizada ✔");
    } catch {
      setPreviewSource("server");
      setPreviewUpdatedAt(new Date());
      setPreviewStatus("Não consegui baixar novamente. Tentando com URL versionada.");
      setPreviewUrl((current) => {
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        return "";
      });
    } finally {
      setRefreshingPreview(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!authenticated) {
      setMessage({ type: "error", text: "Entre na sua conta para configurar o banner." });
      return;
    }
    if (!campaignTitle.trim()) {
      setMessage({ type: "error", text: "Informe o nome da campanha para identificar seu banner." });
      return;
    }
    if (!isSafeHttpUrl(destinationUrl)) {
      setMessage({ type: "error", text: "Informe um link válido começando com http:// ou https://." });
      return;
    }
    if (!mediaUrl) {
      setMessage({ type: "error", text: "Envie a imagem do banner antes de continuar." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/banner-campaigns/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planType: selectedPlan,
          placement,
          bannerQuantity,
          periods,
          campaignTitle,
          destinationUrl,
          mediaUrl,
          bannerImagePositionY: imagePositionY,
          imageZoom,
          imagePositionX,
          imagePositionY,
          rainbowBorderEnabled,
          mediaType: "IMAGE",
          amountCents
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível iniciar o pagamento.");
      if (data?.complimentary && data?.checkoutUrl) {
        setMessage({ type: "success", text: data?.message ?? "Banner liberado como cortesia." });
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setMessage({ type: "success", text: data?.message ?? "Banner configurado com sucesso.", checkoutUrl: data?.checkoutUrl });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível iniciar o pagamento." });
    } finally {
      setSubmitting(false);
    }
  }

  function startImagePositionDrag(event: PointerEvent<HTMLDivElement>) {
    if (!previewImageUrl) return;
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
      // O navegador pode liberar automaticamente em alguns gestos.
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5">
      <section className="grid gap-4 sm:grid-cols-2">
        {plans.map((item) => {
          const selected = item.code === selectedPlan;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => selectPlan(item.code)}
              className={`group relative overflow-hidden rounded-3xl border p-5 text-left shadow-[0_0_34px_rgba(34,197,94,0.22)] transition hover:-translate-y-0.5 ${
                selected
                  ? "border-yellow-300 bg-[linear-gradient(135deg,#22C55E_0%,#22C55E_52%,#FACC15_100%)] text-black ring-4 ring-yellow-300/35"
                  : "border-white/15 bg-[linear-gradient(135deg,#052e16_0%,#16a34a_58%,#f8fafc_165%)] text-white hover:border-yellow-300/60"
              }`}
            >
              <span className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/25 blur-2xl transition group-hover:scale-125" />
              <span className="absolute bottom-0 right-0 h-16 w-28 rounded-tl-full bg-yellow-300/80" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${selected ? "bg-black text-yellow-300" : "bg-yellow-300 text-black"}`}>
                    Plano patrocinado
                  </span>
                  <h2 className="mt-3 text-2xl font-black">{item.title}</h2>
                  <p className={`mt-2 text-4xl font-black ${selected ? "text-black" : "text-yellow-300"}`}>{formatMoney(item.priceCents)}</p>
                  <p className={`mt-2 text-sm font-black ${selected ? "text-black" : "text-white"}`}>1 banner por {item.days} dias.</p>
                </div>
                <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full ${selected ? "bg-black text-yellow-300" : "bg-white text-emerald-700"}`}>
                  {selected ? <CheckCircle2 className="h-6 w-6" /> : "AD"}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">1. Configure e veja a prévia</h2>
            <p className="mt-1 text-sm text-neutral-400">Você pode conferir como o banner aparecerá antes de pagar.</p>
          </div>
          <Link href="/dashboard#meus-banners" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-white hover:bg-white/10">
            <PencilLine size={14} />
            Meus banners
          </Link>
        </div>

        {!authenticated ? (
          <div className="mt-4 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4">
            <p className="text-sm font-bold text-yellow-100">Você precisa entrar para escolher o plano, enviar a imagem e pagar.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/entrar?next=/anunciar-banner" className="inline-flex h-11 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">
                Entrar para anunciar
              </Link>
              <Link href="/cadastro?next=/anunciar-banner" className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-black text-white hover:bg-white/10">
                Criar conta
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm font-black text-neutral-200">Posição do banner</span>
            <select value={placement} onChange={(event) => setPlacement(event.target.value as BannerPlacement)} disabled={!authenticated} className="input">
              <option value="DESKTOP_HERO">Banner Exclusivo (PC/tablet)</option>
              <option value="CAROUSEL">Banner Carrossel com 5 banners</option>
            </select>
            <span className="text-xs text-neutral-400">O Banner Exclusivo aparece somente em PC, notebook e tablet.</span>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-black text-neutral-200">Quantidade de banners</span>
            <select value={bannerQuantity} onChange={(event) => setBannerQuantity(Number(event.target.value))} disabled={!authenticated || placement === "DESKTOP_HERO"} className="input">
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} banner{value > 1 ? "s" : ""}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-black text-neutral-200">Período</span>
            <select value={periods} onChange={(event) => setPeriods(Number(event.target.value))} disabled={!authenticated} className="input">
              {Array.from({ length: plan.maxPeriods }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value} {plan.periodLabel}{value > 1 ? "s" : ""} ({value * plan.days} dias)
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm font-black text-neutral-200">Nome da campanha</span>
            <input value={campaignTitle} onChange={(event) => {
              setCampaignTitle(event.target.value);
              setPreviewUpdatedAt(new Date());
            }} required disabled={!authenticated} maxLength={80} placeholder="Ex.: Promoção oficina julho" className="input" />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm font-black text-neutral-200">Link de Destino:</span>
            <input value={destinationUrl} onChange={(event) => {
              setDestinationUrl(event.target.value);
              setPreviewUpdatedAt(new Date());
            }} required disabled={!authenticated} placeholder="https://seudominio.com.br" className="input" />
            <span className="text-xs text-neutral-400">Aceitamos links começando com http:// ou https://.</span>
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-black/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black">Imagem do banner</p>
              <p className="text-xs text-neutral-400">WebP, JPG ou PNG. Máximo 3 MB.</p>
            </div>
            <label className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200 ${!authenticated || uploading ? "pointer-events-none opacity-60" : ""}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Enviar imagem"}
              <input type="file" accept="image/webp,image/jpeg,image/png" disabled={!authenticated || uploading} onChange={handleFileChange} className="sr-only" />
            </label>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-base font-black">Prévia do seu Banner / Anúncio</h3>
          <p className="mt-1 text-xs text-neutral-400">É assim que o banner aparecerá na página inicial. Depois de pago, você poderá editar imagem, título e link durante o período contratado.</p>
          <div className={`mt-3 overflow-hidden rounded-3xl bg-black ${rainbowBorderEnabled ? "acheix-rainbow-banner p-[3px]" : "border border-yellow-300/25"}`}>
            <div
              className="relative min-h-32 overflow-hidden rounded-[calc(1.5rem-3px)] bg-black sm:min-h-40"
              onPointerDown={startImagePositionDrag}
              onPointerMove={moveImagePositionDrag}
              onPointerUp={finishImagePositionDrag}
              onPointerCancel={finishImagePositionDrag}
              style={{ touchAction: previewImageUrl ? "none" : "auto" }}
            >
              {previewImageUrl ? (
                <img
                  key={previewImageUrl}
                  src={previewImageUrl}
                  alt="Prévia do banner"
                  className="absolute inset-0 h-full w-full select-none object-cover"
                  draggable={false}
                  style={{
                    objectPosition: `${imagePositionX}% ${imagePositionY}%`,
                    transform: `scale(${imageZoom})`,
                    transformOrigin: `${imagePositionX}% ${imagePositionY}%`
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.26),rgba(10,10,10,0.96)_48%,rgba(20,83,45,0.45))]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-black/20" />
              <div className="relative flex min-h-32 items-center justify-between gap-3 px-5 py-4 sm:min-h-40 sm:px-8">
                <div>
                  <p className="text-xs font-black uppercase text-emerald-300">{placement === "DESKTOP_HERO" ? "Espaço exclusivo" : "Espaço patrocinado"}</p>
                  <p className="mt-1 max-w-xl text-2xl font-black text-white sm:text-4xl">{previewTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-neutral-200 sm:text-sm">Clique levará para: {destinationUrl || "seu link"}</p>
                </div>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-lg font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.28)] sm:h-16 sm:w-16 sm:text-xl">
                  AD
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-black text-white">Borda multicolorida</span>
                <span className="block text-xs text-neutral-400">Ative um destaque visual especial em volta da caixa do banner.</span>
              </span>
              <input
                type="checkbox"
                checked={rainbowBorderEnabled}
                disabled={!authenticated}
                onChange={(event) => setRainbowBorderEnabled(event.target.checked)}
                className="h-6 w-6 accent-yellow-300 disabled:opacity-50"
              />
            </label>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3">
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
              }} disabled={!previewImageUrl} className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-xs font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                Centralizar imagem
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <FrameRange label="Zoom" min={1} max={3} step={0.05} value={imageZoom} disabled={!previewImageUrl} onChange={(value) => {
                setImageZoom(clampZoom(value));
                setPreviewUpdatedAt(new Date());
              }} />
              <FrameRange label="Posição X" min={0} max={100} step={1} value={imagePositionX} disabled={!previewImageUrl} onChange={(value) => {
                setImagePositionX(clampPercent(value));
                setPreviewUpdatedAt(new Date());
              }} />
              <FrameRange label="Posição Y" min={0} max={100} step={1} value={imagePositionY} disabled={!previewImageUrl} onChange={(value) => {
                setImagePositionY(clampPercent(value));
                setPreviewUpdatedAt(new Date());
              }} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => refreshBannerPreview()} disabled={!mediaUrl || refreshingPreview} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
              {refreshingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar Prévia
            </button>
            <button type="button" onClick={forceRefreshBannerPreview} disabled={!mediaUrl || refreshingPreview} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#22C55E] px-4 text-xs font-black text-black hover:bg-[#34D399] disabled:cursor-not-allowed disabled:opacity-50">
              {refreshingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Forçar Atualização
            </button>
            <button type="button" onClick={() => setShowFullPreview(true)} disabled={!previewImageUrl} className="inline-flex h-10 items-center gap-2 rounded-full bg-yellow-300 px-4 text-xs font-black text-black hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50">
              <Eye className="h-4 w-4" />
              Visualizar Banner
            </button>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3 text-xs text-neutral-300">
            <p className="font-black text-yellow-100">{previewStatus}</p>
            <p className="mt-1">Última atualização: {previewUpdatedAt ? previewUpdatedAt.toLocaleString("pt-BR") : "Ainda não atualizada"}</p>
            <p className="mt-1 break-all">URL utilizada: {diagnosticUrl}</p>
            <p className="mt-1">Versão: {previewVersion} · Fonte: {previewSourceLabel(previewSource)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4">
          <p className="text-sm text-neutral-200">Total para ativar {placement === "DESKTOP_HERO" ? "no Banner Exclusivo" : "no Banner Carrossel"}</p>
          <p className="text-3xl font-black text-emerald-300">{formatMoney(amountCents)}</p>
          <p className="mt-1 text-xs text-neutral-400">{bannerQuantity} banner{bannerQuantity > 1 ? "s" : ""} por {durationDays} dias. O PIX será gerado pelo Asaas na próxima tela.</p>
        </div>

        {message ? (
          <div className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${message.type === "success" ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : "border-red-300/30 bg-red-500/10 text-red-200"}`}>
            <p>{message.text}</p>
            {message.checkoutUrl ? (
              <a href={message.checkoutUrl} className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-yellow-300 px-4 text-xs font-black text-black">
                Ir para pagamento
              </a>
            ) : null}
          </div>
        ) : null}

        <button disabled={!authenticated || uploading || submitting} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 text-sm font-black text-black hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          {submitting ? "Abrindo pagamento..." : "Pagar e anunciar"}
        </button>
      </section>
      {showFullPreview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
          <div className="w-full max-w-6xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-black text-white">Visualização real do banner</p>
              <button type="button" onClick={() => setShowFullPreview(false)} className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">Fechar</button>
            </div>
            <div className={`overflow-hidden rounded-3xl bg-black ${rainbowBorderEnabled ? "acheix-rainbow-banner p-[3px]" : "border border-yellow-300/25"}`}>
              <div className="relative min-h-32 overflow-hidden rounded-[calc(1.5rem-3px)] bg-black sm:min-h-40 lg:min-h-44">
                {previewImageUrl ? <img key={`full-${previewImageUrl}`} src={previewImageUrl} alt="Visualização do banner" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${imagePositionX}% ${imagePositionY}%`, transform: `scale(${imageZoom})`, transformOrigin: `${imagePositionX}% ${imagePositionY}%` }} /> : null}
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/20" />
                <div className="relative flex min-h-32 items-center justify-between gap-3 px-5 py-4 sm:min-h-40 lg:min-h-44 lg:px-8">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-300">{placement === "DESKTOP_HERO" ? "Espaço exclusivo" : "Espaço patrocinado"}</p>
                    <p className="mt-1 text-2xl font-black text-white sm:text-4xl lg:text-5xl">{previewTitle}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-200 sm:text-sm">{placement === "DESKTOP_HERO" ? "Banner exclusivo Achei X para PC e tablet." : "Espaço patrocinado Achei X."}</p>
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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function withCacheBuster(url: string, version: number) {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(version));
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${version}`;
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

function previewSourceLabel(source: "local" | "server" | "forced" | "empty") {
  if (source === "local") return "arquivo local";
  if (source === "server") return "servidor com cache busting";
  if (source === "forced") return "servidor sem cache";
  return "sem imagem";
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
