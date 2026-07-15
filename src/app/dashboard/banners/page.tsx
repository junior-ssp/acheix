import Link from "next/link";
import { redirect } from "next/navigation";
import { BannerCampaignsManager } from "@/components/banner-campaigns-manager";
import { requireUser } from "@/lib/auth";
import { findUserBannerCampaigns } from "@/lib/banner-campaigns";

export const dynamic = "force-dynamic";

export default async function DashboardBannersPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");
  const bannerCampaigns = await findUserBannerCampaigns(user.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white hover:bg-white/10">
          Voltar
        </Link>
        <Link href="/anunciar-banner" className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm btn-gold">
          Novo Banner
        </Link>
      </div>
      <section id="meus-banners" className="mt-8 scroll-mt-24">
        <p className="text-xs font-black uppercase text-yellow-300">Banners</p>
        <h1 className="mt-1 text-2xl font-black">Meus Banners</h1>
        <p className="mt-1 text-sm text-neutral-400">Gerencie os banners patrocinados junto dos seus anúncios.</p>
        <div className="mt-4">
          <BannerCampaignsManager campaigns={bannerCampaigns} />
        </div>
      </section>
    </main>
  );
}
