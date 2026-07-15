"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Route } from "next";

export function SearchResultModal({
  count,
  labelSingular,
  labelPlural,
  emptyMessage,
  resetHref,
  resultMode = "feed"
}: {
  count: number;
  labelSingular: string;
  labelPlural: string;
  emptyMessage: string;
  resetHref: Route;
  resultMode?: "feed" | "scroll";
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const hasResults = count > 0;
  const label = count === 1 ? labelSingular : labelPlural;

  function seeResults() {
    setOpen(false);
    window.setTimeout(() => {
      if (resultMode === "scroll") {
        document.getElementById("resultados-abertos")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      window.dispatchEvent(new CustomEvent("open-listing-feed"));
    }, 50);
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
      <section className={`w-full max-w-sm rounded-2xl border p-5 shadow-[0_0_55px_rgba(0,0,0,0.55)] ${hasResults ? "border-emerald-300/30 bg-emerald-950/95" : "border-yellow-300/30 bg-neutral-950/95"}`}>
        <p className={`text-sm font-black uppercase ${hasResults ? "text-emerald-200" : "text-yellow-200"}`}>
          Resultado da pesquisa
        </p>
        <p className="mt-2 text-lg font-bold text-white">
          {hasResults ? `${count} ${label} encontrado${count === 1 ? "" : "s"}.` : emptyMessage}
        </p>
        <div className="mt-5 grid gap-3">
          {hasResults ? (
            <button
              type="button"
              onClick={seeResults}
              className="btn-green inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm"
            >
              Ver Resultado{count === 1 ? "" : "s"}
            </button>
          ) : null}
          <Link href={resetHref} className="inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-black btn-gold">
            Refazer Pesquisa
          </Link>
        </div>
      </section>
    </div>
  );
}
