"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { normalizeImageUrl } from "@/lib/image-url";

type GalleryPhoto = {
  url: string;
  alt: string | null;
};

export function ListingPhotoGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
            <Image
              src={normalizeImageUrl(photo.url)}
              alt={photo.alt ?? title}
              fill
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, 520px"
              quality={82}
              className="object-cover"
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
            aria-label="Próxima foto"
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
    </>
  );
}
