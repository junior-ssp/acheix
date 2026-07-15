"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { PublicShareButton } from "@/components/public-share-button";

export type SponsoredBannerSlot = {
  id: number | string;
  label: string;
  title: string;
  mediaUrl?: string | null;
  imagePositionY?: number | null;
  imageZoom?: number | null;
  imagePositionX?: number | null;
  rainbowBorderEnabled?: boolean | null;
  updatedAt?: string | null;
  destinationUrl?: string | null;
  isPlaceholder: boolean;
};

const placeholderSlots: SponsoredBannerSlot[] = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  label: `Banner ${index + 1}`,
  title: "SUA MARCA AQUI",
  mediaUrl: null,
  destinationUrl: null,
  isPlaceholder: true
}));

const desktopHeroSlot: SponsoredBannerSlot = {
  id: "desktop-hero-exclusive",
  label: "Banner exclusivo PC/Tablet",
  title: "ESPAÇO LIVRE",
  mediaUrl: null,
  destinationUrl: null,
  isPlaceholder: true
};

export function SponsoredBannerCarousel({ slots }: { slots?: SponsoredBannerSlot[] }) {
  const displaySlots = useMemo(() => fillBannerSlots(slots ?? []), [slots]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const gestureStartRef = useRef<{ left: number; index: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % displaySlots.length;
        scrollToSlot(next);
        return next;
      });
    }, 7000);

    return () => window.clearInterval(timer);
  }, [displaySlots.length]);

  function scrollToSlot(index: number) {
    const scroller = scrollerRef.current;
    const safeIndex = Math.max(0, Math.min(displaySlots.length - 1, index));
    const item = scroller?.children[safeIndex] as HTMLElement | undefined;
    if (!scroller || !item) return;
    scroller.scrollTo({ left: item.offsetLeft - scroller.offsetLeft, behavior: "smooth" });
  }

  function closestSlotIndex(scroller: HTMLDivElement) {
    const children = Array.from(scroller.children) as HTMLElement[];
    if (!children.length) return 0;

    return children.reduce((bestIndex, item, index) => {
      const currentDistance = Math.abs(item.offsetLeft - scroller.offsetLeft - scroller.scrollLeft);
      const best = children[bestIndex];
      const bestDistance = Math.abs(best.offsetLeft - scroller.offsetLeft - scroller.scrollLeft);
      return currentDistance < bestDistance ? index : bestIndex;
    }, 0);
  }

  function finishManualGesture() {
    const scroller = scrollerRef.current;
    const start = gestureStartRef.current;
    if (!scroller || !start) return;

    const delta = scroller.scrollLeft - start.left;
    const threshold = Math.max(48, scroller.clientWidth * 0.12);
    const direction = Math.abs(delta) < threshold ? 0 : delta > 0 ? 1 : -1;
    const next = Math.max(0, Math.min(displaySlots.length - 1, start.index + direction));
    gestureStartRef.current = null;
    setActiveIndex(next);
    scrollToSlot(next);
  }

  function move(direction: -1 | 1) {
    const next = (activeIndex + direction + displaySlots.length) % displaySlots.length;
    setActiveIndex(next);
    scrollToSlot(next);
  }

  return (
    <section className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-5" aria-label="Banners patrocinados">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">Espaço patrocinado</p>
        </div>
        <Link href="/anunciar-banner" className="hidden rounded-full border border-yellow-300/40 px-4 py-2 text-xs font-black text-yellow-300 hover:bg-yellow-300/10 sm:inline-flex">
          Quero anunciar
        </Link>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement | null)?.closest("[data-banner-share-overlay='true']")) return;
            gestureStartRef.current = { left: event.currentTarget.scrollLeft, index: activeIndex };
          }}
          onPointerUp={finishManualGesture}
          onPointerCancel={finishManualGesture}
          onTouchEnd={finishManualGesture}
          onScroll={(event) => {
            setActiveIndex(closestSlotIndex(event.currentTarget));
          }}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {displaySlots.map((slot, index) => (
            <BannerSlide key={slot.id} slot={slot} isFirst={index === 0} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Banner anterior"
          className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-yellow-300 hover:text-black sm:grid"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Próximo banner"
          className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-yellow-300 hover:text-black sm:grid"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {displaySlots.map((slot, index) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              scrollToSlot(index);
            }}
            aria-label={`Ir para ${slot.label}`}
            className={`h-2 rounded-full transition ${activeIndex === index ? "w-8 bg-yellow-300" : "w-2 bg-white/25"}`}
          />
        ))}
      </div>
    </section>
  );
}

export function SponsoredDesktopHeroBanner({ slot }: { slot?: SponsoredBannerSlot | null }) {
  const displaySlot = slot ?? desktopHeroSlot;

  return (
    <aside className="hidden h-full min-h-[7.5rem] md:block" aria-label="Banner exclusivo para desktop e tablet">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Espaço exclusivo</p>
        <Link href="/anunciar-banner?placement=desktop-hero" className="rounded-full border border-yellow-300/40 px-3 py-1.5 text-[11px] font-black text-yellow-300 hover:bg-yellow-300/10">
          Contratar
        </Link>
      </div>
      <div className="overflow-hidden rounded-3xl">
        <BannerSlide slot={displaySlot} isFirst />
      </div>
    </aside>
  );
}

function BannerSlide({ slot, isFirst }: { slot: SponsoredBannerSlot; isFirst: boolean }) {
  const safeDestinationUrl = safeHttpUrl(slot.destinationUrl);
  const slotVersion = stableSlotVersion(slot.updatedAt);
  const bannerShareVersion = slotVersion;
  const bannerSharePath = `/banner/${encodeURIComponent(String(slot.id))}?v=${encodeURIComponent(bannerShareVersion)}`;
  const versionedMediaUrl = withCacheBuster(slot.mediaUrl, slotVersion);
  const imagePositionY = normalizeImagePositionY(slot.imagePositionY);
  const imagePositionX = normalizeImagePositionY(slot.imagePositionX);
  const imageZoom = normalizeImageZoom(slot.imageZoom);
  const className = slot.rainbowBorderEnabled
    ? "acheix-rainbow-banner group min-w-full snap-center snap-always rounded-3xl p-[3px] shadow-[0_0_34px_rgba(34,211,238,0.22)]"
    : "group min-w-full snap-center snap-always rounded-3xl border border-yellow-300/25 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.26),rgba(10,10,10,0.96)_48%,rgba(20,83,45,0.45))] p-[1px] shadow-[0_0_30px_rgba(250,204,21,0.10)]";
  const realBannerContent = versionedMediaUrl ? (
    <div className="relative min-h-28 overflow-hidden rounded-[calc(1.5rem-1px)] bg-black sm:min-h-36 lg:min-h-40">
      <img
        src={versionedMediaUrl}
        alt={slot.title}
        loading={isFirst ? "eager" : "lazy"}
        fetchPriority={isFirst ? "high" : "low"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: `${imagePositionX}% ${imagePositionY}%`,
          transform: `scale(${imageZoom})`,
          transformOrigin: `${imagePositionX}% ${imagePositionY}%`
        }}
      />
    </div>
  ) : null;
  const placeholderContent = (
    <div className="relative min-h-28 overflow-hidden rounded-[calc(1.5rem-1px)] bg-black/55 sm:min-h-36 lg:min-h-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.26),rgba(10,10,10,0.96)_48%,rgba(20,83,45,0.45))]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/20" />
      <div className="relative flex min-h-28 items-center justify-between gap-3 px-5 py-4 backdrop-blur-[1px] sm:min-h-36 lg:min-h-40 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase text-emerald-300">{slot.label}</p>
          <p className="mt-1 text-2xl font-black text-white sm:text-4xl lg:text-5xl">{slot.title}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-200 sm:text-sm">
            {slot.isPlaceholder ? "Clique para contratar este espaço." : "Espaço patrocinado Achei X."}
          </p>
        </div>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-lg font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.28)] transition group-hover:scale-105 sm:h-16 sm:w-16 sm:text-xl">
          AD
        </span>
      </div>
    </div>
  );

  if (slot.isPlaceholder) {
    return (
      <div className={`${className} relative`}>
        <Link href={slot.id === "desktop-hero-exclusive" ? "/anunciar-banner?placement=desktop-hero" : "/anunciar-banner"} className="block" aria-label={`Contratar ${slot.label}`}>
          {placeholderContent}
        </Link>
        <BannerShareOverlay title="Anuncie sua marca no Achei X" path="/anunciar-banner" />
      </div>
    );
  }

  if (safeDestinationUrl) {
    return (
      <div className={`${className} relative`}>
        <a href={safeDestinationUrl} target="_blank" rel="noopener noreferrer sponsored" className="block" aria-label={slot.title}>
          {realBannerContent ?? placeholderContent}
        </a>
        <BannerShareOverlay title={`Achei este banner: ${slot.title}`} path={bannerSharePath} />
      </div>
    );
  }

  return (
    <div className={`${className} relative`} aria-label={`${slot.title} sem link configurado`}>
      {realBannerContent ?? placeholderContent}
      <BannerShareOverlay title={`Achei este banner: ${slot.title}`} path={bannerSharePath} />
    </div>
  );
}

function BannerShareOverlay({ title, path }: { title: string; path: string }) {
  function stopBannerShareEvent(event: SyntheticEvent) {
    event.stopPropagation();
  }

  return (
    <div
      data-banner-share-overlay="true"
      className="pointer-events-auto absolute right-3 top-3 z-[80]"
      onClick={stopBannerShareEvent}
      onMouseDown={stopBannerShareEvent}
      onMouseUp={stopBannerShareEvent}
      onPointerDown={stopBannerShareEvent}
      onPointerUp={stopBannerShareEvent}
      onTouchStart={stopBannerShareEvent}
      onTouchMove={stopBannerShareEvent}
      onTouchEnd={stopBannerShareEvent}
    >
      <PublicShareButton title={title} path={path} compact />
    </div>
  );
}

function fillBannerSlots(activeSlots: SponsoredBannerSlot[]) {
  const normalized = activeSlots.slice(0, 5).map((slot, index) => ({ ...slot, label: slot.label || `Banner ${index + 1}` }));
  return [...normalized, ...placeholderSlots.slice(normalized.length)];
}

function safeHttpUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function withCacheBuster(value: string | null | undefined, version: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.searchParams.set("v", String(version));
    return url.toString();
  } catch {
    const separator = value.includes("?") ? "&" : "?";
    return `${value}${separator}v=${version}`;
  }
}

function stableSlotVersion(updatedAt?: string | null) {
  if (!updatedAt) return "1";
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) ? parsed.toString(36) : "1";
}

function normalizeImagePositionY(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeImageZoom(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(3, Math.round(value * 100) / 100));
}
