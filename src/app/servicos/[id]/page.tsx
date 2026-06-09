import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefcaseBusiness, MapPin, ShieldCheck, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatCep } from "@/lib/formatters";
import { defaultServiceCategories } from "@/lib/service-catalog";
import { isServiceVisibleByBilling } from "@/lib/service-billing-policy";
import { isServicePublicContactEnabled } from "@/lib/service-contact-disclosure";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PublicShareButton } from "@/components/public-share-button";
import { ServiceContactButton } from "@/components/service-contact-button";

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
            <ServiceAvatar imageUrl={service.imageUrl} title={service.title} />
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

        <p className="mt-5 whitespace-pre-line text-neutral-200">{service.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {service.categories.map((item) => (
            <span key={item} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-neutral-200">{item}</span>
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
      title: profile.nome_fantasia ?? profile.name ?? categoryName(profile.categoria_servico),
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
      imageUrl: profile.tipo_cadastro === "COMPANY" ? profile.logo_empresa : profile.foto_perfil,
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

function ServiceAvatar({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={title} className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover" />;
  }
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-yellow-300 text-black">
      <BriefcaseBusiness size={28} />
    </span>
  );
}


