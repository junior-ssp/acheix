"use client";

import { useEffect, useState } from "react";

export function ServiceFoundPopup({ show, resultCount }: { show: boolean; resultCount: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), resultCount > 0 ? 3600 : 5200);
    return () => window.clearTimeout(timer);
  }, [show, resultCount]);

  if (!visible) return null;

  const found = resultCount > 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4">
      <div className={`animate-achei-found w-full max-w-sm rounded-lg border p-5 text-center shadow-2xl ${found ? "border-emerald-300/40 bg-neutral-950" : "border-yellow-300/40 bg-neutral-950"}`}>
        <img src="/achei-x-logo-small.png" alt="Achei X" className="mx-auto h-20 w-20 rounded-md object-contain" />
        <p className={`mt-4 text-sm font-black uppercase ${found ? "text-emerald-300" : "text-yellow-300"}`}>
          {found ? "Profissional encontrado" : "Nenhum profissional encontrado"}
        </p>
        <h2 className="mt-2 text-xl font-black text-white">
          {found
            ? `${resultCount} profissional${resultCount === 1 ? "" : "ais"} encontrado${resultCount === 1 ? "" : "s"}`
            : "Não encontramos prestadores para essa busca"}
        </h2>
        <p className="mt-2 text-sm text-neutral-300">
          {found
            ? "Os resultados já estão na tela. Você pode fechar este aviso e escolher um prestador."
            : "Tente mudar a profissão, bairro, cidade ou ampliar a região pesquisada."}
        </p>
        <button type="button" onClick={() => setVisible(false)} className="mt-4 h-11 rounded-full px-6 text-sm btn-gold">
          {found ? "Ver resultados" : "Refazer busca"}
        </button>
      </div>
      <style jsx>{`
        @keyframes acheiFound {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.94);
          }
          18% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-achei-found {
          animation: acheiFound 1.15s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
