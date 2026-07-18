"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, MapPin, ShieldCheck, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Route } from "next";
import { EmptyState } from "@/components/empty-state";
import { PublicShareButton } from "@/components/public-share-button";
import { ServiceCategoryIcon, serviceCategoryIconComponent } from "@/components/service-category-icon";
import { ServiceContactButton } from "@/components/service-contact-button";
import { publicServiceAreaText } from "@/lib/service-public-location";
import { ListingMedia } from "@/components/listing-media";

type PublicService = {
  id: string;
  type: string;
  title: string;
  companyName: string | null;
  providerName: string | null;
  category: string;
  categories: string[];
  description: string;
  businessHours: string | null;
  city: string;
  state: string;
  serviceAreas: string[];
  imageUrl: string | null;
  averageRating: number;
  totalRatings: number;
  totalServices: number;
  verified: boolean;
  rank: string;
  score: number;
  distanceKm: number | null;
  contactPublicEnabled: boolean;
  isPro: boolean;
};

export function ServiceResultReel({
  services,
  resetHref,
  authenticated
}: {
  services: PublicService[];
  resetHref: Route;
  authenticated: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function openFeed() {
      setOpen(true);
    }

    window.addEventListener("open-listing-feed", openFeed);
    return () => window.removeEventListener("open-listing-feed", openFeed);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!services.length) {
    return (
      <EmptyState
        title="Nenhum prestador encontrado."
        description="Ajuste a profissão, bairro ou raio de busca para tentar novamente."
      />
    );
  }

  if (!open) return null;

  function closeReel() {
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[92] bg-gradient-to-b from-black/85 via-black/35 to-transparent pb-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={closeReel}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-black/65 px-4 text-sm font-black text-white backdrop-blur hover:bg-white/15"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={closeReel} className="inline-flex h-11 items-center gap-2 rounded-full bg-yellow-300 px-4 text-sm font-black text-black hover:bg-yellow-200">
              <ArrowLeft size={17} />
              Voltar
            </button>
            <button
              type="button"
              onClick={closeReel}
              aria-label="Fechar resultados"
              className="grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white backdrop-blur hover:bg-white/15"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-[100svh] overflow-y-auto snap-y snap-mandatory overscroll-contain">
        {services.map((service, index) => (
          <article key={service.id} className="relative grid min-h-[100svh] snap-start snap-always overflow-hidden bg-neutral-950">
            {service.imageUrl ? (
              <ListingMedia src={service.imageUrl} alt={service.title} sizes="100vw" priority={index === 0} />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_top,#14532d_0%,#050505_58%)]">
                <span className="grid h-32 w-32 place-items-center rounded-3xl bg-emerald-400 text-black shadow-[0_0_45px_rgba(52,211,153,0.35)]">
                  <ServiceFallbackIcon service={service} />
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/25" />
            <div className="absolute right-5 top-1/2 z-[91] -translate-y-1/2 sm:right-6">
              <PublicShareButton title={`Achei este profissional: ${service.title}`} path={`/servicos/${service.id}`} />
            </div>

            <div className="absolute inset-x-0 bottom-0 z-[91] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-4 sm:p-6">
              <div className="max-w-3xl">
                <div className="mb-3 flex items-center justify-end gap-3">
                  <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-black text-white backdrop-blur">
                    {index + 1}/{services.length}
                  </span>
                </div>
                <p className="text-xs font-black uppercase text-yellow-300">{service.type === "COMPANY" ? "Empresa prestadora" : "Profissional autônomo"}</p>
                {service.isPro ? <span className="mt-2 inline-flex rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-100">Prestador PRO</span> : null}
                <h2 className="mt-2 line-clamp-3 text-2xl font-black leading-tight text-white drop-shadow sm:text-5xl">
                  {service.companyName ?? service.title}
                </h2>
                {service.companyName && service.providerName ? <p className="mt-1 text-sm font-bold text-neutral-200">{service.providerName}</p> : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {service.categories.slice(0, 3).map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/90 px-3 py-1 text-xs font-black text-black">
                      <ServiceCategoryIcon value={item} size={14} />
                      {item}
                    </span>
                  ))}
                </div>

                {publicServiceDescription(service) ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-100">{publicServiceDescription(service)}</p> : null}

                <div className="mt-3 grid gap-1.5 text-sm font-bold text-neutral-100">
                  <p className="flex min-w-0 items-start gap-2">
                    <MapPin size={17} className="mt-0.5 shrink-0 text-emerald-300" />
                    <span>{publicServiceAreaText(service.serviceAreas)}</span>
                  </p>
                  {service.distanceKm !== null ? (
                    <p className="flex items-center gap-2 text-emerald-200">
                      <MapPin size={16} />
                      {service.distanceKm} km de distância
                    </p>
                  ) : null}
                  {service.businessHours ? (
                    <p className="flex items-start gap-2">
                      <Clock3 size={16} className="mt-0.5 shrink-0 text-yellow-300" />
                      <span>Atendimento: {service.businessHours}</span>
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2">
                    <Star size={16} className="text-emerald-300" />
                    {service.averageRating || "Novo"}/5 · {service.totalRatings} avaliações · {service.totalServices} serviços
                  </p>
                  <p className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-300" />
                    {service.verified ? "Conta verificada" : "Conta em validação"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:flex">
                <Link href={`/servicos/${service.id}`} className="btn-green inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm sm:w-auto">
                  Ver Perfil do Profissional
                  <ArrowUpRight size={18} />
                </Link>
                <ServiceContactButton serviceId={service.id} serviceTitle={service.title} authenticated={authenticated} contactPublicEnabled={service.contactPublicEnabled} fullWidth />
                <Link href={resetHref} className="inline-flex h-12 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200 sm:w-auto">
                  Refazer Pesquisa
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ServiceFallbackIcon({ service }: { service: PublicService }) {
  const Icon = serviceCategoryIconComponent(service.category);
  return <Icon size={70} strokeWidth={2.4} />;
}

function publicServiceDescription(service: PublicService) {
  const description = String(service.description ?? "").trim();
  return description.length ? description : null;
}
