import Link from "next/link";
import { redirect } from "next/navigation";
import { WantedRequestForm } from "@/components/wanted-request-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WantedRequestPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar?next=/procuro");

  return (
    <main className="acheix-neon-screen relative mx-auto min-h-screen px-4 py-8">
      {/* Glow orbs decorativos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-yellow-300/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-emerald-400/10 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">Achei X</p>
          <h1 className="mt-2 text-3xl font-black text-white drop-shadow-[0_0_18px_rgba(250,204,21,0.25)]">O que você procura?</h1>
        </div>
        {!user.whatsapp ? (
          <section className="acheix-glass-panel rounded-2xl p-6 shadow-[0_0_40px_rgba(250,204,21,0.08)]">
            <h2 className="text-xl font-black text-yellow-100 drop-shadow-[0_0_6px_rgba(250,204,21,0.2)]">Cadastre seu WhatsApp</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Para registrar um Procura-se, seu cadastro precisa ter WhatsApp. É por ele que quem encontrou algo compatível vai falar com você.
            </p>
            <Link href="/dashboard#perfil" className="btn-gold mt-4 inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-black shadow-[0_0_24px_rgba(255,214,0,0.3)]">
              Completar cadastro
            </Link>
          </section>
        ) : (
          <WantedRequestForm />
        )}
      </div>
    </main>
  );
}
