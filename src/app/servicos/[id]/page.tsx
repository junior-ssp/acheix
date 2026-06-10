import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatCep } from "@/lib/formatters";
import { defaultServiceCategories } from "@/lib/service-catalog";
import { isServiceVisibleByBilling, serviceBillingFromComplement } from "@/lib/service-billing-policy";
import { isServicePublicContactEnabled } from "@/lib/service-contact-disclosure";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PublicShareButton } from "@/components/public-share-button";
import { ServiceContactButton } from "@/components/service-contact-button";
import { ServiceCategoryIcon, serviceCategoryIconComponent } from "@/components/service-category-icon";

type PublicServiceProfile = {
  id: string;
  title: string;
  category: string;
  categories: string[];
  description: string;
  city: string;
  district: string | null;
  state: string;
  cep: string | null;
  averageRating: number;
  totalRatings: number;
  totalServices: number;
  verified: boolean;
  rank: string;
  score: number;
  imageUrl: string | null;
  contactPublicEnabled: boolean;
};

export const dynamic = "force-dynamic";

export default async function ServiceProfilePage({ params }: { params: { id: string } }) {
  const [user, service] = await Promise.all([getCurrentUser(), getService(params.id)]);
  if (!service) notFound();

  const publicScore = Math.round(service.score / 10);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <section className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ServiceAvatar imageUrl={service.imageUrl} title={service.title} category={service.category} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-yellow-300">{service.categories[0]}</p>
              <h1 className="mt-1 break-words text-2xl font-black">{service.title}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-neutral-300">
                <MapPin size={15} />
                {service.district ? `${service.district}, ` : ""}{service.city}/{service.state}
              </p>
            </div>
          </div>
          <PublicShareButton title={`Achei este profissional: ${service.title}`} path={`/servicos/${service.id}`} compact />
        </div>

        {publicServiceDescription(service) ? <p className="mt-5 whitespace-pre-line text-neutral-200">{publicServiceDescription(service)}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {service.categories.map((item) => (
            <span key={item} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-2 py-3 text-center text-[10px] font-black uppercase leading-tight text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.10)]">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-300 text-black shadow-[0_0_16px_rgba(250,204,21,0.28)]">
                <ServiceCategoryIcon value={item} size={24} strokeWidth={2.8} />
              </span>
              <span>{item}</span>
            </span>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-neutral-300">
          <strong className="flex items-center gap-2 text-white">
            <ShieldCheck size={16} />
            {service.rank === "FEATURED" ? "Medalha Diamante" : `Medalha ${rankName(service.rank)}`}
          </strong>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span><Star size={14} className="inline" /> {service.averageRating || "Novo"}/5</span>
            <span>{service.totalRatings} avaliações</span>
            <span>{service.totalServices} serviços</span>
            <span>Nota {publicScore}/10</span>
          </p>
          {service.verified ? <p className="mt-2 text-emerald-200">Conta verificada</p> : null}
          {service.cep ? <p className="mt-2">CEP {formatCep(service.cep)}</p> : null}
        </div>

        <ServiceContactButton serviceId={service.id} serviceTitle={service.title} authenticated={Boolean(user)} contactPublicEnabled={service.contactPublicEnabled} />

        <Link href="/servicos" className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">
          Buscar Outro
        </Link>
      </section>
    </main>
  );
}

async function getService(id: string): Promise<PublicServiceProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("service_profiles")
    .select("id,tipo_cadastro,categoria_servico,categorias_servico,name,nome_fantasia,descricao,cidade,bairro,cep,estado,foto_perfil,logo_empresa,avaliacao_media,total_avaliacoes,total_servicos,conta_verificada,rank,score,active,status,complemento")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (profile && profile.active && ["ACTIVE", "INACTIVE"].includes(profile.status) && isServiceVisibleByBilling(profile.complemento)) {
    return {
      id: profile.id,
      title: serviceTitle(profile.nome_fantasia, profile.name, profile.categoria_servico),
      category: profile.categoria_servico,
      categories: (profile.categorias_servico ?? [profile.categoria_servico]).map(categoryName),
      description: profile.descricao,
      city: profile.cidade,
      district: profile.bairro,
      state: profile.estado,
      cep: profile.cep,
      averageRating: profile.avaliacao_media,
      totalRatings: profile.total_avaliacoes,
      totalServices: profile.total_servicos,
      verified: profile.conta_verificada,
      rank: profile.rank,
      score: profile.score,
      imageUrl: serviceProfileImage(profile.logo_empresa, profile.foto_perfil, profile.complemento),
      contactPublicEnabled: isServicePublicContactEnabled(profile.complemento)
    };
  }

  return null;

}

function categoryName(slug: string) {
  return defaultServiceCategories.find((item) => item.slug === slug)?.name ?? slug;
}

function rankName(rank: string) {
  if (rank === "GOLD") return "Ouro";
  if (rank === "SILVER") return "Prata";
  return "Bronze";
}

function serviceTitle(companyName: string | null, providerName: string | null, category: string) {
  const publicCompany = publicName(companyName);
  const publicProvider = publicName(providerName);
  return publicCompany ?? publicProvider ?? categoryName(category);
}

function publicServiceDescription(service: PublicServiceProfile) {
  const description = String(service.description ?? "").trim();
  if (!description) return null;
  const normalizedDescription = normalize(description);
  if (normalize(service.title) && normalizedDescription.startsWith(`${normalize(service.title)} atende em`)) return null;
  if (looksLikeFiscalName(description.split(" atende em ")[0] ?? "")) return null;
  return description;
}

function publicName(value: string | null | undefined) {
  const name = String(value ?? "").trim();
  if (!name || looksLikeFiscalName(name)) return null;
  return name;
}

function looksLikeFiscalName(value: string) {
  const text = String(value ?? "").trim();
  return /^\d{2}\.?\d{3}\.?\d{3}/.test(text) || /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-?\d{2}\b/.test(text);
}

function normalize(value?: string | null) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function ServiceAvatar({ imageUrl, title, category }: { imageUrl: string | null; title: string; category: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={title} className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover" />;
  }
  const Icon = serviceCategoryIconComponent(category);
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-yellow-300 text-black">
      <Icon size={28} />
    </span>
  );
}

function serviceProfileImage(logo: string | null | undefined, photo: string | null | undefined, complement: string | null | undefined) {
  const billing = serviceBillingFromComplement(complement);
  return billing.planCode === "SERVICE_PRO" && billing.status !== "HIDDEN" ? logo ?? photo ?? null : null;
}


