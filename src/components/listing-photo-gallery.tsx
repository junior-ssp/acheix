"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeImageUrl } from "@/lib/image-url";
import { ListingMedia } from "@/components/listing-media";
import { Maximize2, Minus, Plus, X } from "lucide-react";

type GalleryPhoto = {
  url: string;
  alt: string | null;
};

export function ListingPhotoGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!fullScreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [fullScreen]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const gallery = element;

    const updateActivePhoto = () => {
      const width = gallery.clientWidth || 1;
      const index = Math.round(gallery.scrollLeft / width);
      setActiveIndex(Math.min(Math.max(index, 0), photos.length - 1));
    };

    updateActivePhoto();
    gallery.addEventListener("scroll", updateActivePhoto, { passive: true });
    window.addEventListener("resize", updateActivePhoto);
    return () => {
      gallery.removeEventListener("scroll", updateActivePhoto);
      window.removeEventListener("resize", updateActivePhoto);
    };
  }, [photos.length]);

  function goTo(index: number) {
    const element = scrollRef.current;
    if (!element || !photos.length) return;
    const nextIndex = (index + photos.length) % photos.length;
    element.scrollTo({ left: nextIndex * element.clientWidth, behavior: "smooth" });
    setActiveIndex(nextIndex);
  }

  if (!photos.length) {
    return <div className="grid h-full place-items-center text-neutral-400">Sem foto</div>;
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-x-contain touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, index) => (
          <div key={`${photo.url}-${index}`} className="relative h-full w-full shrink-0 snap-center">
            <ListingMedia
              src={normalizeImageUrl(photo.url)}
              alt={photo.alt ?? title}
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, 520px"
              quality={82}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Foto anterior"
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-3xl font-black leading-none text-white shadow-lg backdrop-blur transition hover:bg-yellow-300 hover:text-black md:grid"
          >
            &lt;
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Proxima foto"
            className="absolute right-16 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-3xl font-black leading-none text-white shadow-lg backdrop-blur transition hover:bg-yellow-300 hover:text-black md:grid"
          >
            &gt;
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-[8.5rem] z-10 flex justify-center gap-1.5 px-4">
            {photos.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ir para foto ${index + 1}`}
                className={`pointer-events-auto h-1.5 rounded-full bg-white shadow transition ${index === activeIndex ? "w-6 opacity-100" : "w-1.5 opacity-60"}`}
              />
            ))}
          </div>
        </>
      ) : null}
      <button type="button" onClick={() => { setZoom(1); setFullScreen(true); }} aria-label="Abrir imagem em tela cheia" className="absolute bottom-3 right-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/65 text-white shadow-xl backdrop-blur-xl hover:border-cyan-300/50 hover:text-cyan-200">
        <Maximize2 size={19} />
      </button>
      {fullScreen ? (
        <div className="fixed inset-0 z-[260] grid bg-black/95 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
          <div className="relative min-h-0 overflow-auto">
            <ListingMedia src={photos[activeIndex]?.url} alt={photos[activeIndex]?.alt ?? title} sizes="100vw" priority imageClassName="transition-transform duration-200" className="min-h-[100svh]" />
            <div className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[262] flex gap-2">
              <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))} aria-label="Diminuir zoom" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-xl"><Minus size={19} /></button>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label="Aumentar zoom" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-xl"><Plus size={19} /></button>
              <button type="button" onClick={() => setFullScreen(false)} aria-label="Fechar tela cheia" className="grid h-11 w-11 place-items-center rounded-full border border-red-300/30 bg-red-400/15 text-red-100 backdrop-blur-xl"><X size={19} /></button>
            </div>
            {photos.length > 1 ? (
              <>
                <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Imagem anterior em tela cheia" className="fixed left-3 top-1/2 z-[262] grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/65 text-2xl font-black text-white backdrop-blur-xl">&lt;</button>
                <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Proxima imagem em tela cheia" className="fixed right-3 top-1/2 z-[262] grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/65 text-2xl font-black text-white backdrop-blur-xl">&gt;</button>
              </>
            ) : null}
            {zoom > 1 ? <div className="pointer-events-none fixed inset-0 z-[261] origin-center" style={{ transform: `scale(${zoom})` }}><ListingMedia src={photos[activeIndex]?.url} alt="" sizes="100vw" priority /></div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
