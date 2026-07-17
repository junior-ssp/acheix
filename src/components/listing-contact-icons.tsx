"use client";

import { ExternalLink, Facebook, Globe, Instagram, MessageCircle, Music2, Phone, Youtube } from "lucide-react";

type ContactIconInput = {
  phone?: string | null;
  tollFree?: string | null;
  whatsapp?: string | null;
  whatsapp2?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  vidiu?: string | null;
  title: string;
};

export function ListingContactIcons(input: ContactIconInput) {
  const primary = primaryPhoneContact(input);
  const links = [
    primary,
    iconLink("Site", normalizeHref(input.website), Globe),
    iconLink("Facebook", normalizeHref(input.facebook), Facebook),
    iconLink("Instagram", normalizeHref(input.instagram), Instagram),
    iconLink("YouTube", normalizeHref(input.youtube), Youtube),
    iconLink("TikTok", normalizeHref(input.tiktok), Music2),
    iconLink("Vídio", normalizeHref(input.vidiu), ExternalLink)
  ].filter((link): link is ContactIconLink => Boolean(link?.href));

  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={`${link.label}-${link.href}`}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            title={link.label}
            aria-label={link.label}
            className={`grid h-8 w-8 place-items-center rounded-full border text-white transition hover:-translate-y-0.5 sm:h-9 sm:w-9 ${link.highlight ? "border-emerald-300/50 bg-emerald-500" : "border-white/15 bg-white/5 hover:border-yellow-300/50"}`}
          >
            <Icon size={15} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

type ContactIconLink = {
  label: string;
  href: string;
  icon: typeof Phone;
  external: boolean;
  highlight?: boolean;
};

function primaryPhoneContact(input: ContactIconInput): ContactIconLink | null {
  const whatsapp = cleanPhone(input.whatsapp) || cleanPhone(input.whatsapp2);
  if (whatsapp) {
    const message = `Tenho interesse no anúncio "${input.title}" que vi no Achei X.`;
    return {
      label: cleanPhone(input.whatsapp) ? "WhatsApp 1" : "WhatsApp 2",
      href: `https://wa.me/${withBrazilCountryCode(whatsapp)}?text=${encodeURIComponent(message)}`,
      icon: MessageCircle,
      external: true,
      highlight: true
    };
  }

  const phone = cleanPhone(input.phone) || cleanPhone(input.tollFree);
  return phone ? { label: "Telefone", href: `tel:${phone}`, icon: Phone, external: false, highlight: true } : null;
}

function iconLink(label: string, href: string, icon: typeof Phone): ContactIconLink | null {
  return href ? { label, href, icon, external: true } : null;
}

function cleanPhone(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
}

function withBrazilCountryCode(value: string) {
  return value.startsWith("55") && value.length >= 12 ? value : `55${value}`;
}

function normalizeHref(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}
