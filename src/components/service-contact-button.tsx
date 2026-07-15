"use client";

import { useState } from "react";
import { Eye, Mail, Phone, Send } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

type PublicContact = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
};

const whatsappIntroMessage = "Como vai, tudo bem ? Peguei seu contato nos *Classificados Achei X*, podemos conversar ?";

export function ServiceContactButton({
  serviceId,
  serviceTitle,
  authenticated,
  contactPublicEnabled,
  fullWidth = false
}: {
  serviceId: string;
  serviceTitle: string;
  authenticated: boolean;
  contactPublicEnabled?: boolean;
  fullWidth?: boolean;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState<PublicContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [leadBusy, setLeadBusy] = useState(false);

  async function revealContact() {
    if (!authenticated) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/entrar?next=${encodeURIComponent(next)}`;
      return;
    }
    if (contact) {
      setContactOpen((value) => !value);
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/services/${serviceId}/contact`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (response.ok) {
      setContact(data.contact ?? null);
      setContactOpen(true);
      return;
    }
    setMessage(data?.error ?? "Contato não disponível.");
  }

  async function sendLead(formData: FormData) {
    if (!authenticated) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/entrar?next=${encodeURIComponent(next)}`;
      return;
    }
    setLeadBusy(true);
    setMessage("");
    const response = await fetch(`/api/services/${serviceId}/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const data = await response.json().catch(() => null);
    setLeadBusy(false);
    if (response.ok) {
      setMessage(data?.message ?? "Interesse enviado. O prestador recebeu seu contato e em breve poderá retornar.");
      setLeadOpen(false);
      return;
    }
    setMessage(data?.error ?? "Não foi possível enviar seu interesse.");
  }

  return (
    <div className={fullWidth ? "w-full" : "mt-3"}>
      <div className={fullWidth ? "grid gap-2" : "flex flex-wrap gap-2"}>
        <button type="button" onClick={() => {
          if (!authenticated) {
            const next = `${window.location.pathname}${window.location.search}`;
            window.location.href = `/entrar?next=${encodeURIComponent(next)}`;
            return;
          }
          setLeadOpen((value) => !value);
        }} className={`${fullWidth ? "h-12 w-full" : "h-10"} inline-flex items-center justify-center gap-2 rounded-full px-4 text-sm btn-gold`}>
          <Send size={16} />
          Tenho Interesse
        </button>
        {contactPublicEnabled ? (
          <button type="button" onClick={revealContact} disabled={busy} className={`${fullWidth ? "h-12 w-full" : "h-10"} btn-green inline-flex items-center justify-center gap-2 rounded-full px-4 text-sm disabled:opacity-60`}>
            <Eye size={16} />
            {busy ? "Carregando..." : "Ver Contato"}
          </button>
        ) : null}
      </div>

      {leadOpen ? (
        <form
          className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-black/30 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            sendLead(new FormData(event.currentTarget));
          }}
        >
          <p className="text-xs text-neutral-300">Envie seus dados para {serviceTitle} avaliar e retornar.</p>
          <input name="phone" inputMode="numeric" maxLength={15} placeholder="Telefone ou WhatsApp para retorno" onChange={(event) => { event.currentTarget.value = formatPhone(event.currentTarget.value); }} className="input" />
          <textarea name="message" rows={3} maxLength={280} placeholder="Observação opcional" className="input" />
          <button disabled={leadBusy} className="h-10 rounded-md btn-gold disabled:opacity-60">{leadBusy ? "Enviando..." : "Enviar interesse"}</button>
        </form>
      ) : null}

      {contactOpen ? (
        <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-neutral-100">
          {contact?.whatsapp ? (
            <a href={`https://wa.me/55${contact.whatsapp}?text=${encodeURIComponent(whatsappIntroMessage)}`} target="_blank" rel="noreferrer" className="btn-green inline-flex h-10 items-center justify-center gap-2 rounded-md px-3">
              <Phone size={16} />
              WhatsApp {formatPhone(contact.whatsapp)}
            </a>
          ) : null}
          {contact?.phone && contact.phone !== contact.whatsapp ? (
            <a href={`tel:+55${contact.phone}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 px-3 font-black text-white">
              <Phone size={16} />
              Telefone {formatPhone(contact.phone)}
            </a>
          ) : null}
          {contact?.email ? (
            <a href={`mailto:${contact.email}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 px-3 font-black text-white">
              <Mail size={16} />
              Email {contact.email}
            </a>
          ) : null}
          {!contact?.phone && !contact?.whatsapp && !contact?.email ? <p className="text-xs text-neutral-400">Nenhum contato público disponível.</p> : null}
        </div>
      ) : null}
      {message ? <p className="mt-2 text-xs text-yellow-300">{message}</p> : null}
    </div>
  );
}
