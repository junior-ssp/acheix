"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function PixCopyBox({ value }: { value: string }) {
  const [message, setMessage] = useState("");
  const pixCode = value.trim();
  const preview = maskPixPayload(pixCode);

  async function copyPix() {
    try {
      await copyText(pixCode);
      setMessage("PIX copia e cola copiado.");
    } catch {
      setMessage("Não foi possível copiar automaticamente. Tente escanear o QR Code.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase text-yellow-300">PIX Copia e Cola</p>
        <button
          type="button"
          onClick={copyPix}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#22C55E] px-3 text-xs font-black text-black hover:bg-[#34D399]"
        >
          <Copy size={14} />
          Copiar
        </button>
      </div>
      <div className="mt-2 break-all rounded-md border border-white/10 bg-black/40 p-3 font-mono text-xs text-neutral-200" aria-label="Prévia mascarada do PIX copia e cola">
        {preview}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Por segurança, alguns dados do recebedor ficam ocultos na tela. Use o botão Copiar para copiar o código PIX oficial completo.
      </p>
      {message ? <p className="mt-2 text-xs font-bold text-emerald-300">{message}</p> : null}
    </div>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("copy_failed");
}

function maskPixPayload(value: string) {
  if (!value) return "";
  if (value.length <= 48) return value;
  return `${value.slice(0, 28)}....................${value.slice(-18)}`;
}
