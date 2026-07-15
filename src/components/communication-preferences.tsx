"use client";

import { useState } from "react";

const noticeLabels = {
  IN_APP: "Aviso dentro do Achei X",
  PUSH: "Notificação no celular/navegador",
  WHATSAPP: "Receber avisos pelo WhatsApp",
  SMS: "Receber avisos por SMS",
  EMAIL: "Receber avisos por e-mail"
} as const;

type Channel = keyof typeof noticeLabels;
type PublicContact = "whatsapp" | "phone" | "email";
type PublicPermissions = Record<PublicContact, boolean>;

const publicLabels: Record<PublicContact, string> = {
  whatsapp: "Permitir WhatsApp nos anúncios",
  phone: "Permitir telefone nos anúncios",
  email: "Permitir e-mail nos anúncios"
};

export function CommunicationPreferences({ initialChannels, initialPublicPermissions }: { initialChannels: Channel[]; initialPublicPermissions: PublicPermissions }) {
  const [channels, setChannels] = useState<Channel[]>(normalizeChannels(initialChannels));
  const [publicPermissions, setPublicPermissions] = useState(initialPublicPermissions);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(nextChannels: Channel[], nextPublicPermissions: PublicPermissions) {
    const previousChannels = channels;
    const previousPermissions = publicPermissions;
    const normalized = normalizeChannels(nextChannels);
    setChannels(normalized);
    setPublicPermissions(nextPublicPermissions);
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationChannels: normalized, publicContactPermissions: nextPublicPermissions })
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    setMessage(response.ok ? "Preferências salvas." : data?.error ?? "Não foi possível salvar.");
    if (!response.ok) {
      setChannels(previousChannels);
      setPublicPermissions(previousPermissions);
    }
  }

  function toggleNotice(option: Channel) {
    if (requiredChannels.includes(option)) return setMessage(`${noticeLabels[option]} é obrigatório.`);
    const next = channels.includes(option) ? channels.filter((channel) => channel !== option) : [...channels, option];
    void save(next, publicPermissions);
  }

  function togglePublic(option: PublicContact) {
    void save(channels, { ...publicPermissions, [option]: !publicPermissions[option] });
  }

  return (
    <section className="mt-8 rounded-lg border border-sky-400/55 bg-[linear-gradient(145deg,#101010_0%,#101620_60%,#071827_100%)] p-4 shadow-[0_0_26px_rgba(56,189,248,0.12)]">
      <h2 className="text-xl font-black">Privacidade e Comunica&ccedil;&otilde;es</h2>
      <p className="mt-1 text-sm text-neutral-400">Escolha separadamente como o Achei X avisa você e quais contatos outras pessoas podem ver.</p>
      <div className="mt-5 rounded-lg border border-white/10 bg-black/35 p-3">
        <h3 className="font-black text-white">1. Como quero receber avisos</h3>
        <p className="mt-1 text-xs text-neutral-400">Isso não altera os contatos mostrados nos seus anúncios.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(Object.keys(noticeLabels) as Channel[]).map((option) => <PreferenceSwitch key={option} label={noticeLabels[option]} active={channels.includes(option)} locked={requiredChannels.includes(option)} disabled={saving} onClick={() => toggleNotice(option)} />)}
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-yellow-300/25 bg-yellow-300/10 p-3">
        <h3 className="font-black text-white">2. Contatos visíveis nos meus anúncios</h3>
        <p className="mt-1 text-xs text-neutral-300">Ao desligar um canal aqui, ele é ocultado imediatamente de todos os anúncios atuais. Cada anúncio novo também começa com contatos externos desligados.</p>
        <div className="mt-3 grid gap-2">
          {(Object.keys(publicLabels) as PublicContact[]).map((option) => <PreferenceSwitch key={option} label={publicLabels[option]} active={publicPermissions[option]} disabled={saving} onClick={() => togglePublic(option)} />)}
        </div>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-yellow-300">{message}</p> : null}
    </section>
  );
}

function PreferenceSwitch({ label, active, locked = false, disabled, onClick }: { label: string; active: boolean; locked?: boolean; disabled: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={disabled || locked} aria-pressed={active} className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black px-4 py-3 text-left text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-80"><span>{label}{locked ? " (obrigatório)" : ""}</span><span className={`relative h-7 w-12 shrink-0 rounded-full transition ${active ? "bg-[#22C55E]" : "bg-red-600"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? "left-6" : "left-1"}`} /></span></button>;
}

function normalizeChannels(channels: Channel[]) {
  const fallback: Channel[] = ["IN_APP", "PUSH", "EMAIL"];
  return [...new Set([...(channels.length ? channels : fallback), ...requiredChannels])] as Channel[];
}

const requiredChannels: Channel[] = ["IN_APP"];
