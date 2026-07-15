import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardListings } from "@/components/dashboard-listings";
import { requireUser } from "@/lib/auth";
import { findDashboardListings } from "@/lib/dashboard-listings-data";

export const dynamic = "force-dynamic";

export default async function DashboardMeusAnunciosPage({ searchParams }: { searchParams?: { meus?: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");
  const requestedListingFilter = ["DRAFT", "ACTIVE", "PENDING_REVIEW", "EXPIRING", "EXPIRED", "SOLD_RENTED"].includes(searchParams?.meus ?? "") ? searchParams?.meus ?? "ALL" : "ALL";
  const listings = await findDashboardListings(user.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white hover:bg-white/10">
        Voltar
      </Link>
      <DashboardListings listings={listings as any} accountType={user.accountType} cnpj={user.cnpj} initialFilter={requestedListingFilter} />
    </main>
  );
}
