import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardManualListings } from "@/components/dashboard-manual-listings";
import { requireUser } from "@/lib/auth";
import { canManageManualListings, findManagerManualListings } from "@/lib/manual-listings";

export const dynamic = "force-dynamic";

export default async function DashboardAnunciosAvulsosPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");
  if (!canManageManualListings(user)) redirect("/dashboard");
  const manualListings = await findManagerManualListings(user);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white hover:bg-white/10">
        Voltar
      </Link>
      <DashboardManualListings initialItems={manualListings} />
    </main>
  );
}
