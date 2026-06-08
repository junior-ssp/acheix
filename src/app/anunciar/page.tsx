import { ListingForm } from "@/components/listing-form";
import { PublishLoginPrompt } from "@/components/publish-login-prompt";
import { requireUser } from "@/lib/auth";
import { planCatalog } from "@/lib/constants";
import { isCnpjAccount, isProfessionalPlanCode } from "@/lib/plan-rules";

export default async function NewListingPage({ searchParams }: { searchParams: { category?: string; planCode?: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    const params = new URLSearchParams();
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.planCode) params.set("planCode", searchParams.planCode);
    const nextPath = `/anunciar${params.size ? `?${params.toString()}` : ""}`;
    return <PublishLoginPrompt nextPath={nextPath} />;
  }

  const initialCategory = searchParams.category === "REAL_ESTATE" ? "REAL_ESTATE" : "VEHICLE";
  const allowedPlans = planCatalog.filter((plan) => !isProfessionalPlanCode(plan.code) || isCnpjAccount(user));
  const initialPlanCode = allowedPlans.some((plan) => plan.code === searchParams.planCode) ? searchParams.planCode as (typeof planCatalog)[number]["code"] : "FREE";
  const title = initialCategory === "VEHICLE" ? "Anunciar Veículo" : "Anunciar Imóvel";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mb-6 mt-2 text-neutral-600 dark:text-neutral-300">Escolha o plano e preencha seu anúncio.</p>
      <ListingForm initialCategory={initialCategory} initialPlanCode={initialPlanCode} accountType={user.accountType} cnpj={user.cnpj} initialState={user.state} initialCity={user.city} />
    </main>
  );
}
