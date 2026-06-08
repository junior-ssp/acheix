"use client";

import { useState } from "react";
import { ChevronDown, Flag } from "lucide-react";

const reportReasons = [
  { publicReason: "FRAUD_SUSPECT", reason: "SCAM_ATTEMPT", label: "🚨 1. Suspeita de Golpe ou Fraude" },
  { publicReason: "MISLEADING_INFO", reason: "FAKE_LISTING", label: "📢 2. Anúncio Enganoso ou Informações Falsas" },
  { publicReason: "PROHIBITED_CONTENT", reason: "INAPPROPRIATE_CONTENT", label: "🚫 3. Conteúdo Proibido ou Irregular" },
  { publicReason: "BAD_USER_BEHAVIOR", reason: "HARASSMENT_OR_THREAT", label: "🤬 4. Comportamento Inadequado do Usuário" },
  { publicReason: "NON_EXISTENT_ADVERTISER", reason: "NON_EXISTENT_PRODUCT", label: "📍 5. Anunciante ou Prestador de Serviços Inexistente" }
] as const;

export function ReportListingButton({
  slug
}: {
  slug: string;
  ownerId?: string | null;
  canBlock?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const selectedReason = reportReasons.find((item) => item.publicReason === formData.get("publicReason"));
      const evidenceUrls = await uploadEvidence(formData.getAll("evidence"));
      const response = await fetch(`/api/listings/${slug}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicReason: selectedReason?.publicReason,
          reason: selectedReason?.reason,
          description: formData.get("description"),
          evidenceUrls
        })
      });
      const data = await response.json().catch(() => null);

      setBusy(false);
      setMessage(response.ok ? "Recebemos seu aviso. Vamos analisar." : data?.error ?? "Não deu para enviar agora.");
      if (response.ok) event.currentTarget.reset();
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Não deu para enviar agora.");
    }
  }

  return (
    <section className="rounded-2xl border border-[#ff2800] bg-[#ff2800] p-3 shadow-[0_0_24px_rgb(255_40_0_/_0.22)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-black text-white"
      >
        <span className="inline-flex items-center gap-2">
          <Flag size={17} />
          Reportar Problema
        </span>
        <ChevronDown size={17} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <form onSubmit={report} className="mt-3 grid gap-3">
          <select name="publicReason" required className="input">
            {reportReasons.map((item) => (
              <option key={item.publicReason} value={item.publicReason}>
                {item.label}
              </option>
            ))}
          </select>
          <textarea name="description" required minLength={10} rows={4} placeholder="Descreva o Problema ou Conte o que aconteceu" className="input" />
          <label className="grid cursor-pointer gap-2 rounded-xl border border-white/30 bg-black/20 p-3 text-sm font-black text-white hover:bg-black/30">
            <span>📷 Anexar Evidência</span>
            <input
              name="evidence"
              type="file"
              accept="image/*,video/*"
              multiple
              className="text-xs font-bold text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-black file:text-[#ff2800]"
            />
          </label>
          <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/35 bg-white px-4 text-sm font-black text-[#ff2800] hover:bg-white/90 disabled:opacity-60">
            <Flag size={16} />
            {busy ? "Enviando..." : "Enviar"}
          </button>
          {message ? <p className="text-xs font-bold text-white">{message}</p> : null}
        </form>
      ) : null}
    </section>
  );
}

async function uploadEvidence(files: FormDataEntryValue[]) {
  const selectedFiles = files.filter((file): file is File => file instanceof File && file.size > 0);
  if (!selectedFiles.length) return [];

  const urls: string[] = [];
  for (const file of selectedFiles) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/uploads/report-evidence", {
      method: "POST",
      body: formData
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.url) {
      throw new Error(data?.error ?? "Não deu para anexar a evidência.");
    }
    urls.push(data.url);
  }
  return urls;
}
