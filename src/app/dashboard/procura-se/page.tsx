import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardWantedRequests } from "@/components/dashboard-wanted-requests";
import { requireUser } from "@/lib/auth";
import { findUserWantedRequests } from "@/lib/wanted-requests";

export const dynamic = "force-dynamic";

export default async function DashboardProcuraSePage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");
  const wantedRequests = await findUserWantedRequests(user.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white hover:bg-white/10">
        Voltar
      </Link>
      <DashboardWantedRequests requests={wantedRequests} />
    </main>
  );
}
