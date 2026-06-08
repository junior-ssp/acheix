import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ReviewServicePage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin();
  const { data: contact, error } = await supabase
    .from("ServiceContact")
    .select("id,reviewedAt,service:ServiceListing(title),profile:service_profiles!ServiceContact_profileId_fkey(name,nome_fantasia)")
    .eq("reviewToken", params.token)
    .maybeSingle();
  if (error) throw error;
  if (!contact || contact.reviewedAt) notFound();

  const profile = Array.isArray(contact.profile) ? contact.profile[0] : contact.profile;
  const service = Array.isArray(contact.service) ? contact.service[0] : contact.service;
  const serviceTitle = profile?.nome_fantasia ?? profile?.name ?? service?.title ?? "este prestador";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-black uppercase text-yellow-300">Avaliação de Serviço</p>
      <h1 className="mt-2 text-3xl font-black">Como foi sua experiência com {serviceTitle}?</h1>
      <p className="mt-2 text-neutral-300">Sua resposta ajuda outros usuários e melhora a qualidade dos profissionais no Achei X.</p>
      <form action={`/api/service-reviews/${params.token}`} method="POST" className="mt-6 grid gap-3">
        <button name="outcome" value="SUCCESS" className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4 text-left font-black text-emerald-100">Deu tudo certo</button>
        <button name="outcome" value="PROBLEM" className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-left font-black text-yellow-100">Tive um problema</button>
        <button name="outcome" value="REPORT" className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-left font-black text-yellow-100">Reportar Problema</button>
        <textarea name="comment" maxLength={500} rows={4} placeholder="Conte rapidamente o que aconteceu (opcional)" className="input" />
      </form>
    </main>
  );
}
