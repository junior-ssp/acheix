import Link from "next/link";
import { redirect } from "next/navigation";
import { WantedRequestForm } from "@/components/wanted-request-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WantedRequestPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar?next=/procuro");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5">
        <p className="text-xs font-black uppercase text-yellow-300">Achei X</p>
        <h1 className="mt-1 text-3xl font-black">O que você procura?</h1>
      </div>
      {!user.whatsapp ? (
        <section className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-5">
          <h2 className="text-xl font-black text-yellow-100">Cadastre seu WhatsApp</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-200">
            Para registrar um Procura-se, seu cadastro precisa ter WhatsApp. É por ele que quem encontrou algo compatível vai falar com você.
          </p>
          <Link href="/dashboard#perfil" className="mt-4 inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">
            Completar cadastro
          </Link>
        </section>
      ) : (
        <WantedRequestForm />
      )}
    </main>
  );
}
