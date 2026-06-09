import { PublishLoginPrompt } from "@/components/publish-login-prompt";
import { ServiceForm } from "@/components/service-form";
import { requireUser } from "@/lib/auth";
import { parseServiceComplement, serviceContactPreferenceFromComplement } from "@/lib/service-contact-disclosure";
import { isServicePlanCode, type ServicePlanCode } from "@/lib/service-plans";
import { getSupabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewServicePage({ searchParams }: { searchParams?: { servicePlan?: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return (
      <PublishLoginPrompt
        nextPath="/servicos/anunciar"
        title="Cadastre-se para anunciar seus serviços"
        description="Para aparecer como Prestador de Serviços no Achei X, primeiro crie sua conta. Assim seus dados, autorizações e solicitações de interessados ficam registrados com segurança."
      />
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from("service_profiles")
    .select("id,active,status,tipo_cadastro,categorias_servico,name,razao_social,nome_fantasia,document,telefone_privado,whatsapp_privado,estado,cidade,bairro,cep,endereco,numero,complemento,foto_perfil,logo_empresa")
    .eq("user_id", user.id)
    .maybeSingle();
  const serviceProfileEnabled = Boolean(profile?.active && ["ACTIVE", "INACTIVE"].includes(profile.status));
  const hasExistingServiceProfile = Boolean(profile?.id && profile.status !== "CLOSED");
  const complement = parseServiceComplement(profile?.complemento);
  if (!hasExistingServiceProfile && !isServicePlanCode(searchParams?.servicePlan)) redirect("/servicos/planos");
  const currentBillingPlan = complement.serviceBilling?.planCode === "SERVICE_PRO" ? "SERVICE_PRO" : null;
  const servicePlanCode: ServicePlanCode = currentBillingPlan ?? (isServicePlanCode(searchParams?.servicePlan) ? searchParams.servicePlan : "SERVICE_FREE");
  const contactDisclosure = complement.contactDisclosure;
  const initialProfile = profile && profile.status !== "CLOSED" ? {
    type: profile.tipo_cadastro,
    categories: profile.categorias_servico ?? [],
    name: profile.name,
    companyLegalName: profile.razao_social,
    companyTradeName: profile.nome_fantasia,
    document: profile.document,
    privatePhone: profile.telefone_privado,
    privateWhatsapp: profile.whatsapp_privado,
    state: profile.estado,
    city: profile.cidade,
    district: profile.bairro,
    cep: profile.cep,
    address: profile.endereco,
    number: profile.numero,
    complement: profile.complemento,
    contactPublicEnabled: Boolean(contactDisclosure?.publicContactEnabled),
    contactDisclosureAcceptedAt: contactDisclosure?.acceptedAt ?? null,
    contactPreference: serviceContactPreferenceFromComplement(profile.complemento),
    companyLogo: profile.logo_empresa,
  } : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase text-yellow-300">Serviços</p>
      <h1 className="mt-2 text-3xl font-black">Perfil Profissional</h1>
      <p className="mb-6 mt-2 max-w-3xl text-neutral-300">
        Ative sua aba de serviços para aparecer nas buscas por região. Seus contatos só aparecem para visitantes se você autorizar a exibição pública.
      </p>
      <ServiceForm initialEnabled={serviceProfileEnabled} hasExistingProfile={hasExistingServiceProfile} initialProfile={initialProfile} servicePlanCode={servicePlanCode} user={{ name: user.name, phone: user.phone, whatsapp: user.whatsapp, accountType: user.accountType, cnpj: user.cnpj, state: user.state, city: user.city, district: user.district, cep: user.cep }} />
    </main>
  );
}
