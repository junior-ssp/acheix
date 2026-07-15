import Link from "next/link";
import { Building2, Car, HomeIcon, Package, Wrench } from "lucide-react";
import { ListingForm } from "@/components/listing-form";
import { PublishLoginPrompt } from "@/components/publish-login-prompt";
import { requireUser } from "@/lib/auth";
import { planCatalog } from "@/lib/constants";
import { isCnpjAccount, isPlanAllowedForCategory, isProfessionalPlanCode } from "@/lib/plan-rules";

export default async function NewListingPage({ searchParams }: { searchParams: { category?: string; planCode?: string } }) {
  const hasCategory = searchParams.category === "PRODUCT" || searchParams.category === "REAL_ESTATE" || searchParams.category === "VEHICLE";
  if (!hasCategory) return <AnnounceCategoryChooser planCode={searchParams.planCode} />;

  const initialCategory = searchParams.category === "PRODUCT" ? "PRODUCT" : searchParams.category === "REAL_ESTATE" ? "REAL_ESTATE" : "VEHICLE";
  const user = await requireUser().catch(() => null);
  if (!user) {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.planCode) params.set("planCode", searchParams.planCode);
    const nextPath = `/anunciar${params.size ? `?${params.toString()}` : ""}`;
    return <PublishLoginPrompt nextPath={nextPath} />;
  }

  const allowedPlans = planCatalog.filter((plan) => !isProfessionalPlanCode(plan.code) || isCnpjAccount(user));
  const requestedPlan = planCatalog.find((plan) => plan.code === searchParams.planCode);
  if (requestedPlan && isProfessionalPlanCode(requestedPlan.code) && !isCnpjAccount(user)) {
    return <ProfessionalPlanAccountNotice planName={requestedPlan.name} />;
  }
  const allowedInitialPlan = allowedPlans.some((plan) => plan.code === searchParams.planCode && isPlanAllowedForCategory(plan.code, initialCategory));
  const initialPlanCode = allowedInitialPlan ? searchParams.planCode as (typeof planCatalog)[number]["code"] : initialCategory === "PRODUCT" ? "PRODUCT_MINI" : "FREE";
  const title = initialCategory === "VEHICLE" ? "Anunciar Veículo" : initialCategory === "REAL_ESTATE" ? "Anunciar Imóvel" : "Anunciar Produto";
  const subtitle = initialCategory === "PRODUCT" ? "Escolha o plano, adicione as fotos permitidas e preencha seu anúncio." : "Escolha o plano e preencha seu anúncio.";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mb-6 mt-2 text-neutral-600 dark:text-neutral-300">{subtitle}</p>
      <ListingForm
        initialCategory={initialCategory}
        initialPlanCode={initialPlanCode}
        accountType={user.accountType}
        cnpj={user.cnpj}
        initialState={user.state}
        initialCity={user.city}
        contactPermissions={{
          phone: user.allowPublicPhone,
          whatsapp: user.allowPublicWhatsapp,
          email: user.allowPublicEmail
        }}
      />
    </main>
  );
}

function AnnounceCategoryChooser({ planCode }: { planCode?: string }) {
  const selectedPlan = planCatalog.find((plan) => plan.code === planCode);
  const selectedPlanCode = selectedPlan?.code;
  const listingHref = (category: "PRODUCT" | "VEHICLE" | "REAL_ESTATE") => {
    const params = new URLSearchParams({ category });
    if (selectedPlanCode) params.set("planCode", selectedPlanCode);
    return `/anunciar?${params.toString()}` as const;
  };
  const options = [
    { title: "Produtos", description: "Venda itens avulsos com planos pagos.", href: listingHref("PRODUCT"), icon: Package, accent: "bg-orange-400", enabled: selectedPlanCode ? selectedPlanCode !== "FREE" && isPlanAllowedForCategory(selectedPlanCode, "PRODUCT") : true, unavailable: selectedPlanCode === "FREE" ? "Produtos exigem um plano pago." : "Este plano não atende Produtos." },
    { title: "Veículos", description: "Carro, moto, utilitário e mais.", href: listingHref("VEHICLE"), icon: Car, accent: "bg-emerald-400", enabled: selectedPlanCode ? isPlanAllowedForCategory(selectedPlanCode, "VEHICLE") : true, unavailable: "Este plano é exclusivo para Produtos." },
    { title: "Imóveis", description: "Casa, apartamento, terreno e locação.", href: listingHref("REAL_ESTATE"), icon: HomeIcon, accent: "bg-sky-400", enabled: selectedPlanCode ? isPlanAllowedForCategory(selectedPlanCode, "REAL_ESTATE") : true, unavailable: "Este plano é exclusivo para Produtos." },
    { title: "Empresas / Lojas", description: "Possui planos próprios para empresas.", href: "/servicos/planos" as const, icon: Building2, accent: "bg-purple-400", enabled: true, unavailable: "" },
    { title: "Serviços", description: "Possui planos próprios para prestadores.", href: "/servicos/planos" as const, icon: Wrench, accent: "bg-yellow-300", enabled: true, unavailable: "" }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase text-yellow-300">Anunciar</p>
      <h1 className="mt-2 text-3xl font-black">Escolha a categoria do anúncio</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-300">
        {selectedPlan ? `Plano selecionado: ${selectedPlan.name}. Agora escolha uma categoria compatível.` : "Escolha uma categoria para ver os planos e o formulário correto."}
      </p>
      <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {options.map((option) => {
          const Icon = option.icon;
          if (!option.enabled) {
            return (
              <article key={option.title} aria-disabled="true" title={option.unavailable} className="flex aspect-square cursor-not-allowed flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/55 p-3 text-center opacity-55 sm:aspect-auto sm:min-h-24">
                <span className={`grid h-10 w-10 place-items-center rounded-xl text-black grayscale ${option.accent}`}><Icon size={22} strokeWidth={2.7} /></span>
                <strong className="text-sm font-black text-white sm:text-base">{option.title}</strong>
              </article>
            );
          }
          return (
            <Link key={option.title} href={option.href as any} className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/90 p-3 text-center font-black text-white shadow-[0_0_24px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-yellow-300/50 sm:aspect-auto sm:min-h-24">
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-black ${option.accent}`}>
                <Icon size={22} strokeWidth={2.7} />
              </span>
              <strong className="text-sm font-black text-white group-hover:text-yellow-200 sm:text-base">{option.title}</strong>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

function ProfessionalPlanAccountNotice({ planName }: { planName: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <section className="rounded-3xl border border-yellow-300/40 bg-yellow-300/10 p-6 text-white">
        <p className="text-xs font-black uppercase text-yellow-300">Plano profissional</p>
        <h1 className="mt-2 text-3xl font-black">{planName} exige uma conta com CNPJ</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-200">O plano escolhido não foi trocado. Atualize sua conta para CNPJ ou selecione outro plano compatível.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-full bg-yellow-300 px-4 text-sm font-black text-black">Atualizar minha conta</Link>
          <Link href="/planos" className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-black text-white">Escolher outro plano</Link>
        </div>
      </section>
    </main>
  );
}
