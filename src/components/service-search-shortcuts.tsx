"use client";

function scrollToBlock(id: string) {
  const element = document.getElementById(id);
  if (!element) return;

  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ServiceSearchShortcuts() {
  return (
    <div className="flex w-full flex-wrap justify-center gap-2 sm:w-auto">
      <button type="button" onClick={() => scrollToBlock("busca-profissao")} className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">
        Busca por Profissão
      </button>
      <button
        type="button"
        onClick={() => scrollToBlock("busca-regiao")}
        className="inline-flex h-11 items-center justify-center rounded-full border border-yellow-300/55 bg-black/40 px-4 text-sm font-black text-yellow-300"
      >
        Busca por Região
      </button>
    </div>
  );
}
