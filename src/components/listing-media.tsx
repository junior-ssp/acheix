"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { normalizeImageUrl } from "@/lib/image-url";

export type ListingMediaProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
  className?: string;
  imageClassName?: string;
};

export function ListingMedia({ src, alt, sizes, priority = false, quality = 82, className = "", imageClassName = "" }: ListingMediaProps) {
  const normalizedSrc = normalizeImageUrl(src, "");
  const [failed, setFailed] = useState(!normalizedSrc);

  useEffect(() => setFailed(!normalizedSrc), [normalizedSrc]);

  return (
    <div className={`relative isolate h-full w-full overflow-hidden bg-black ${className}`}>
      {!failed ? (
        <Image
          src={normalizedSrc}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className={`object-contain object-center ${imageClassName}`}
        />
      ) : (
        <div role="img" aria-label={`${alt} - imagem indisponível`} className="absolute inset-0 grid place-items-center bg-black px-4 text-center text-neutral-400">
          <span className="grid justify-items-center gap-2 text-xs font-bold"><ImageOff size={28} />Imagem indisponível</span>
        </div>
      )}
    </div>
  );
}
