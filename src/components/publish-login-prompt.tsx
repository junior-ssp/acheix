import Link from "next/link";
import { LockKeyhole, UserPlus } from "lucide-react";

export function PublishLoginPrompt({
  nextPath,
  title = "Cadastre-se para publicar",
  description = "Para anunciar no Achei X, primeiro crie sua conta. Assim seus anúncios, pagamentos, interessados e renovações ficam protegidos no seu painel."
}: {
  nextPath: string;
  title?: string;
  description?: string;
}) {
  const encodedNext = encodeURIComponent(nextPath);

  return (
    <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-yellow-300/25 bg-neutral-950 p-5 text-center shadow-2xl shadow-black/30 sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-yellow-300 text-black">
          <UserPlus size={28} strokeWidth={2.8} />
        </span>
        <h1 className="mt-4 text-3xl font-black text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">{description}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={`/cadastro?next=${encodedNext}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">
            <UserPlus size={18} />
            Criar Cadastro
          </Link>
          <Link href={`/entrar?next=${encodedNext}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-black text-white hover:bg-white/10">
            <LockKeyhole size={18} />
            Já Tenho Conta
          </Link>
        </div>
      </section>
    </main>
  );
}
